import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export type TimelineItem = { t: string; txt: string; cur?: boolean };

export type Order = {
  id: string;
  no: string;
  userId: string;
  cat: string;
  icon: string;
  title: string;
  type: string;
  status: 'wait' | 'doing' | 'ok';
  statusText: string;
  summary: string;
  time: string;
  detail: { rows: [string, string][]; timeline: TimelineItem[] };
  fields?: Record<string, string>;
};

export type ServiceItem = {
  key: string;
  name: string;
  icon: string;
  tag: string;
  enabled: boolean;
  featured: boolean;
  sort: number;
  prefix: string;
};

export type Cadre = { av: string; name: string; role: string; phone: string };
export type Grid = { name: string; lead: string; households: string };
export type Knowledge = { id: string; title: string; content: string; tags: string[]; category: string };

export type Db = {
  users: { id: string; name: string; phone: string; group: string }[];
  admins: { id: string; username: string; password: string }[];
  orders: Order[];
  services: ServiceItem[];
  village: {
    name: string;
    region: string;
    intro: string;
    address: string;
    hotline: string;
    hours: string;
    cadres: Cadre[];
    grids: Grid[];
    rulesHtml: string;
  };
  knowledge: Knowledge[];
  tokens: Record<string, string>;
};

const TZ = 'Asia/Shanghai';

function shanghaiParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return parts;
}

function now() {
  const p = shanghaiParts();
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function seed(): Db {
  return {
    users: [{ id: 'u1', name: '张大叔', phone: '138****1234', group: '老虎洞村 2组' }],
    admins: [{ id: 'a1', username: 'admin', password: 'admin123' }],
    tokens: {},
    services: [
      { key: 'problem', name: '反映问题', icon: '📋', tag: 'FK 问题工单', enabled: true, featured: true, sort: 1, prefix: 'FK' },
      { key: 'repair', name: '设施报修', icon: '🔧', tag: 'BX 报修工单', enabled: true, featured: true, sort: 2, prefix: 'BX' },
      { key: 'sell', name: '卖农产品', icon: '🌾', tag: 'SP 上架审核', enabled: true, featured: true, sort: 3, prefix: 'SP' },
      { key: 'policy', name: '政策咨询', icon: '📖', tag: '知识问答', enabled: true, featured: true, sort: 4, prefix: 'YY' },
      { key: 'hall', name: '礼堂预约', icon: '🏛️', tag: 'LT 红白事预约', enabled: true, featured: true, sort: 5, prefix: 'LT' },
      { key: 'medical', name: '医疗挂号', icon: '🏥', tag: 'GH 挂号', enabled: true, featured: true, sort: 6, prefix: 'GH' },
      { key: 'village', name: '村务公开', icon: '🏘️', tag: '龙溪村', enabled: true, featured: true, sort: 7, prefix: '' },
      { key: 'skill', name: '技能咨询', icon: '🎓', tag: 'JN 技能咨询', enabled: true, featured: false, sort: 8, prefix: 'PX' },
      { key: 'health', name: '健康咨询', icon: '💊', tag: '健康导引', enabled: true, featured: false, sort: 9, prefix: '' },
      { key: 'job', name: '找活干', icon: '💼', tag: 'QZ 求职登记', enabled: true, featured: false, sort: 10, prefix: 'QZ' },
      { key: 'meal', name: '老年订餐', icon: '🍚', tag: 'DC 订餐单', enabled: true, featured: false, sort: 11, prefix: 'DC' },
      { key: 'help', name: '邻里互助', icon: '🤝', tag: 'HZ 互助需求', enabled: true, featured: false, sort: 12, prefix: 'HZ' },
    ],
    village: {
      name: '龙溪村',
      region: '浙江省湖州市 · 长兴县 · 小浦镇',
      intro: '龙溪村位于长兴县小浦镇，因龙溪穿村而过得名。全村辖 6 个村民小组，常住人口约 1200 人。',
      address: '龙溪路 88 号',
      hotline: '0572-60****88',
      hours: '周一至周五 8:30-17:00',
      cadres: [
        { av: '👨‍💼', name: '王建国', role: '村支书 · 兼村主任', phone: '138****1001' },
        { av: '👩‍💼', name: '李秀英', role: '副书记 · 分管民政', phone: '139****1002' },
        { av: '👨‍💼', name: '张强', role: '村委委员 · 分管综治', phone: '137****1003' },
        { av: '👩‍💼', name: '陈芳', role: '村委委员 · 分管财务', phone: '136****1004' },
        { av: '👨‍💼', name: '赵明', role: '村委委员 · 分管农业', phone: '135****1005' },
      ],
      grids: [
        { name: '1组（龙溪头）', lead: '王大哥', households: '42户' },
        { name: '2组（溪南）', lead: '李大姐', households: '38户' },
        { name: '3组（溪北）', lead: '张叔', households: '45户' },
        { name: '4组（山脚）', lead: '陈婶', households: '36户' },
        { name: '5组（新村）', lead: '赵哥', households: '40户' },
        { name: '6组（龙溪尾）', lead: '刘姐', households: '35户' },
      ],
      rulesHtml:
        '<b>一、环境卫生</b><br>房前屋后保持整洁，垃圾定点投放。<br><br><b>二、邻里和睦</b><br>互尊互让，矛盾先找网格长调解。<br><br><b>三、红白喜事</b><br>简办节约，使用文化礼堂需预约。<br><br><b>四、生态保护</b><br>保护龙溪水系，禁止电鱼毒鱼。<br><br><b>五、安全治理</b><br>发现安全隐患及时报告村委。',
    },
    knowledge: [
      {
        id: 'k1',
        title: '生态养殖补贴',
        category: 'policy',
        tags: ['补贴', '养鸡', '养殖'],
        content: '条件：生态散养、规模 30 只以上。标准：每只 5 元，最高补 500 只。到村委便民窗口办理。',
      },
      {
        id: 'k2',
        title: '板栗保存小知识',
        category: 'life',
        tags: ['板栗', '保存'],
        content: '阴凉通风摊开晾 2～3 天；装透气网袋冷藏可存 1～2 个月；勿密封塑料袋以防发霉。',
      },
      {
        id: 'k3',
        title: '节气与农事 · 小暑',
        category: 'life',
        tags: ['节气', '小暑', '农事'],
        content: '水稻分蘖期浅水灌溉；玉米大豆中耕除草；注意瓜果病虫害防治。',
      },
      {
        id: 'k4',
        title: '电商入门培训',
        category: 'skill',
        tags: ['电商', '培训', '直播'],
        content: '镇电商服务站免费入门班，含短视频与直播带货基础；可约村电商达人一对一辅导。',
      },
    ],
    orders: [
      {
        id: uuid(),
        no: 'LT20260715088',
        userId: 'u1',
        cat: 'book',
        icon: '🏛️',
        title: '文化礼堂预约',
        type: '红事寿宴 · 7月15日中午',
        status: 'wait',
        statusText: '待确认',
        summary: '18桌 · 张师傅+李帮厨 · 去虾加土鹅',
        time: '2026-07-08 09:12',
        detail: {
          rows: [
            ['类型', '红事宴席（寿宴）'],
            ['日期', '7月15日 中午 11:00-14:00'],
            ['场地', '文化礼堂 · 已预留'],
            ['规模', '18桌 · 约180人'],
            ['厨师', '张师傅 + 李帮厨'],
            ['菜单', '标准套餐（2桌清淡）'],
            ['费用', '约 9000元（待确认）'],
          ],
          timeline: [
            { t: '2026-07-08 09:12', txt: '提交预约申请', cur: true },
            { t: '—', txt: '村委确认档期' },
            { t: '—', txt: '预约成功，推送进场须知' },
          ],
        },
      },
      {
        id: uuid(),
        no: 'GH20260709001',
        userId: 'u1',
        cat: 'book',
        icon: '🏥',
        title: '医疗挂号',
        type: '小浦镇卫生院 · 内科',
        status: 'ok',
        statusText: '已预约',
        summary: '7月9日上午 · 15号 · 带好医保卡',
        time: '2026-07-08 10:30',
        detail: {
          rows: [
            ['医院', '小浦镇卫生院'],
            ['科室', '内科'],
            ['时间', '7月9日 上午 9:30'],
            ['序号', '15号（预估）'],
            ['就诊人', '张大叔 138****1234'],
          ],
          timeline: [
            { t: '2026-07-08 10:30', txt: '挂号成功' },
            { t: '2026-07-08 18:00', txt: '就诊前 1 天提醒', cur: true },
            { t: '—', txt: '到院取号就诊' },
          ],
        },
      },
      {
        id: uuid(),
        no: 'FK20260708001',
        userId: 'u1',
        cat: 'feedback',
        icon: '📋',
        title: '问题反馈',
        type: '环境卫生 · 垃圾桶满溢',
        status: 'ok',
        statusText: '已完成',
        summary: '村口公交站旁 · 已清理完毕',
        time: '2026-07-06 14:30',
        detail: {
          rows: [
            ['类型', '环境卫生'],
            ['位置', '村口公交站旁'],
            ['处理人', '村委小张'],
            ['结果', '垃圾桶已清空，增设临时投放点'],
          ],
          timeline: [
            { t: '2026-07-06 14:30', txt: '提交反馈' },
            { t: '2026-07-06 16:00', txt: '已受理，派单处理' },
            { t: '2026-07-07 10:20', txt: '处理完成，上传现场照片', cur: true },
          ],
        },
      },
      {
        id: uuid(),
        no: 'BX20260708014',
        userId: 'u1',
        cat: 'feedback',
        icon: '🔧',
        title: '设施报修',
        type: '路灯故障 · 3组文化礼堂',
        status: 'doing',
        statusText: '维修中',
        summary: '夜间不亮 · 电工王师傅已接单',
        time: '2026-07-07 18:45',
        detail: {
          rows: [
            ['设施', '路灯（3组文化礼堂门口）'],
            ['故障', '夜间不亮'],
            ['维修人', '电工王师傅'],
            ['预计', '7月9日前完成'],
          ],
          timeline: [
            { t: '2026-07-07 18:45', txt: '提交报修' },
            { t: '2026-07-07 19:10', txt: '已派单给王师傅' },
            { t: '2026-07-08 08:00', txt: '维修中，已采购配件', cur: true },
          ],
        },
      },
      {
        id: uuid(),
        no: 'SP20260708002',
        userId: 'u1',
        cat: 'product',
        icon: '🌾',
        title: '商品上架',
        type: '新鲜板栗 · 8元/斤',
        status: 'ok',
        statusText: '已上架',
        summary: '约200斤 · 已在村民商城展示',
        time: '2026-07-05 11:00',
        detail: {
          rows: [
            ['商品', '新鲜板栗'],
            ['数量', '约 200 斤'],
            ['价格', '8 元/斤'],
            ['审核', '已通过'],
          ],
          timeline: [
            { t: '2026-07-05 11:00', txt: '提交上架申请' },
            { t: '2026-07-05 15:30', txt: '审核通过' },
            { t: '2026-07-05 16:00', txt: '已上架村民商城', cur: true },
          ],
        },
      },
    ],
  };
}

let cache: Db | null = null;

export function loadDb(): Db {
  if (cache) return cache;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    cache = seed();
    saveDb(cache);
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as Db;
  return cache;
}

export function saveDb(db: Db) {
  cache = db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function genOrderNo(prefix: string) {
  const p = shanghaiParts();
  const stamp = `${p.year}${p.month}${p.day}`;
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix || 'XX'}${stamp}${rand}`;
}

export { now, uuid };
