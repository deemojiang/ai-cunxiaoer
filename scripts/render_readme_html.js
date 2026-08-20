/**
 * Convert docs/未来乡村AI版-便民服务需求清单.md -> HTML and embed into
 * docs/未来乡村AI版原型.html (and parent copy if present) between
 * <!-- DOC_BODY_START --> ... <!-- DOC_BODY_END -->.
 * Self-contained for file:// open — no iframe / README.html dependency.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'docs', '未来乡村AI版-便民服务需求清单.md');
const protoPaths = [
  path.join(root, 'docs', '未来乡村AI版原型.html'),
  path.join(root, '..', '未来乡村AI版原型.html'),
];

const START = '<!-- DOC_BODY_START -->';
const END = '<!-- DOC_BODY_END -->';

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function loadMarked() {
  const src = await get('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js');
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    console,
    define: undefined,
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.runInNewContext(src, sandbox, { timeout: 10000 });
  const marked = module.exports.marked || module.exports;
  if (!marked || typeof marked.parse !== 'function') {
    const keys = Object.keys(module.exports || {});
    throw new Error(`Failed to load marked from CDN; export keys=${keys.join(',')}`);
  }
  return marked;
}

/** Strip BOM, merge-attribution / generated notes before embedding. */
function cleanMd(md) {
  return md
    .replace(/^\uFEFF/, '')
    .replace(/[ \t]*·[ \t]*合并版[^\n*]*/g, '')
    .replace(/\*文档版本：[^*]*合并[^*]*\*/g, '*文档版本：v1.4*')
    .replace(/\n{3,}/g, '\n\n');
}

function embedInto(html, bodyHtml) {
  const i0 = html.indexOf(START);
  const i1 = html.indexOf(END);
  if (i0 < 0 || i1 < 0 || i1 <= i0) {
    throw new Error('DOC_BODY markers not found in prototype HTML');
  }
  return (
    html.slice(0, i0 + START.length) +
    '\n' +
    bodyHtml.trim() +
    '\n' +
    html.slice(i1)
  );
}

(async () => {
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Requirements MD not found: ${mdPath}`);
  }
  const md = cleanMd(fs.readFileSync(mdPath, 'utf8'));
  const marked = await loadMarked();
  const body = marked.parse(md);

  let updated = 0;
  for (const p of protoPaths) {
    if (!fs.existsSync(p)) {
      console.warn(`Skip (missing): ${p}`);
      continue;
    }
    const html = fs.readFileSync(p, 'utf8');
    if (!html.includes(START) || !html.includes(END)) {
      console.warn(`Skip (no markers): ${p}`);
      continue;
    }
    fs.writeFileSync(p, embedInto(html, body), 'utf8');
    updated += 1;
    console.log(`Embedded into ${p}`);
  }

  const tables = (body.match(/<table>/g) || []).length;
  console.log(`tables=${tables} h2=${(body.match(/<h2/g) || []).length} updated=${updated}`);
  if (updated === 0) {
    throw new Error('No prototype HTML files were updated');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
