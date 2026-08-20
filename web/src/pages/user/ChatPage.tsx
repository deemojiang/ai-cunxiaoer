import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type ServiceItem } from '../../api/client';
import { scenarios, HOME_FEATURED } from '../../engine/scenarios';
import { recognizeIntent, answerGeneral, isOrderStatusQuery } from '../../engine/intent';
import { createVoiceRecognizer, isSpeechRecognitionSupported, type VoiceRecognizer } from '../../engine/voice';
import { fetchLiveWeather } from '../../engine/weather';
import type { ChatMsg, Ctx, Scenario, Step } from '../../engine/types';
import { tpl } from '../../engine/types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TextWaiter = {
  resolve: (v: string) => void;
  my: number;
  placeholder?: string;
};

export default function ChatPage() {
  const nav = useNavigate();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ kind: 'welcome' }]);
  const [step, setStep] = useState<Step | 0>(0);
  const [showStepper, setShowStepper] = useState(false);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docHtml, setDocHtml] = useState(() => renderDocMarkdown(DOC_SUMMARY));
  const [busy, setBusy] = useState(false);
  const [awaitingText, setAwaitingText] = useState(false);
  const [inputHint, setInputHint] = useState('说句话或打字，问村小二…');
  const chatRef = useRef<HTMLDivElement>(null);
  const abort = useRef(0);
  const textWaiter = useRef<TextWaiter | null>(null);
  const voiceRef = useRef<VoiceRecognizer | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(false);
  const touchUsedRef = useRef(false);

  const LONG_PRESS_MS = 300;

  useEffect(() => {
    api.services().then(setServices).catch(() => {
      setServices(
        Object.values(scenarios).map((s, i) => ({
          key: s.key,
          name: s.name,
          icon: s.icon,
          tag: s.tag,
          enabled: true,
          featured: HOME_FEATURED.includes(s.key),
          sort: i + 1,
          prefix: '',
        })),
      );
    });
    const onSend = (e: Event) => {
      const q = (e as CustomEvent).detail as string;
      if (q) sendText(q);
    };
    window.addEventListener('ai-send', onSend);
    return () => window.removeEventListener('ai-send', onSend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      voiceRef.current?.abort();
      voiceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (!docOpen) return;
    let cancelled = false;
    fetch('/docs/需求文档摘要.md')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((md) => {
        if (!cancelled) setDocHtml(renderDocMarkdown(md));
      })
      .catch(() => {
        if (!cancelled) setDocHtml(renderDocMarkdown(DOC_SUMMARY));
      });
    return () => {
      cancelled = true;
    };
  }, [docOpen]);

  const append = (m: ChatMsg | ChatMsg[]) =>
    setMsgs((prev) => [...prev, ...(Array.isArray(m) ? m : [m])]);

  const goHome = () => {
    abort.current++;
    textWaiter.current = null;
    setAwaitingText(false);
    setInputHint('说句话或打字，问村小二…');
    setBusy(false);
    setShowStepper(false);
    setStep(0);
    setShowAll(false);
    setMsgs([{ kind: 'welcome' }]);
  };

  async function submitOrder(p: import('../../engine/types').CreateOrderPayload) {
    try {
      const order = await api.createOrder({
        prefix: p.prefix,
        cat: p.cat,
        icon: p.icon,
        title: p.title,
        type: p.type,
        status: p.status,
        statusText: p.statusText,
        summary: p.summary,
        detail: {
          rows: p.rows,
          timeline: p.track.map((txt, i) => ({
            t: '—',
            txt,
            cur: i === 0,
          })),
        },
      });
      append({
        kind: 'card',
        card: {
          title: p.title,
          no: order.no,
          status: [order.status, order.statusText],
          rows: p.rows,
          track: p.track,
          on: 0,
        },
      });
    } catch (e) {
      append({ kind: 'bot', text: `生单失败：${(e as Error).message}` });
    }
  }

  function waitTextInput(demo: string, my: number, placeholder?: string): Promise<string> {
    return new Promise((resolve) => {
      setAwaitingText(true);
      setInputHint(placeholder || '请输入具体情况…');
      let settled = false;
      const finish = (v: string) => {
        if (settled) return;
        settled = true;
        textWaiter.current = null;
        setAwaitingText(false);
        setInputHint('说句话或打字，问村小二…');
        resolve(v);
      };
      textWaiter.current = { resolve: finish, my, placeholder };
      const timer = setTimeout(() => {
        if (my === abort.current && !settled) finish(demo);
      }, 8000);
      const check = setInterval(() => {
        if (my !== abort.current) {
          clearTimeout(timer);
          clearInterval(check);
          if (!settled) {
            settled = true;
            textWaiter.current = null;
            setAwaitingText(false);
          }
        }
      }, 200);
    });
  }

  async function runScenario(sc: Scenario, skipUserLabel = false) {
    const my = ++abort.current;
    const ctx: Ctx = {};
    setBusy(true);
    setShowStepper(true);
    setMsgs([{ kind: 'time', text: '今天' }]);
    if (!skipUserLabel) append({ kind: 'user', text: `${sc.icon} ${sc.name}` });
    await sleep(300);
    if (my !== abort.current) return;

    const labels: Record<string, number> = {};
    sc.steps.forEach((n, i) => {
      if ('label' in n && n.label) labels[n.label] = i;
    });

    for (let i = 0; i < sc.steps.length; i++) {
      const node = sc.steps[i];
      if (my !== abort.current) return;
      if ('label' in node) continue;
      if ('goto' in node) {
        const target = typeof node.goto === 'function' ? node.goto(ctx) : node.goto;
        if (target && labels[target] != null) {
          i = labels[target] - 1;
        }
        continue;
      }
      if ('step' in node) {
        setStep(node.step);
        await sleep(200);
        continue;
      }
      if ('botFn' in node) {
        append({ kind: 'bot', text: node.botFn(ctx) });
        await sleep(450);
        continue;
      }
      if ('bot' in node) {
        append({ kind: 'bot', text: tpl(node.bot, ctx) });
        await sleep(450);
        continue;
      }
      if ('user' in node) {
        append({ kind: 'user', text: tpl(node.user, ctx) });
        await sleep(350);
        continue;
      }
      if ('img' in node) {
        append({ kind: 'img', label: node.img });
        await sleep(350);
        continue;
      }
      if ('waitText' in node) {
        const demo =
          typeof node.waitText.demo === 'function'
            ? node.waitText.demo(ctx)
            : node.waitText.demo;
        const answered = await waitTextInput(demo, my, node.waitText.placeholder);
        if (my !== abort.current) return;
        ctx[node.waitText.as] = answered;
        append({ kind: 'user', text: answered });
        await sleep(300);
        continue;
      }
      if ('waitImg' in node) {
        append({ kind: 'img', label: node.waitImg.label });
        ctx[node.waitImg.as] = node.waitImg.label;
        await sleep(350);
        continue;
      }
      if ('opts' in node) {
        const picked = await waitPick(node.opts, node.pick, my);
        if (my !== abort.current) return;
        if (node.as) ctx[node.as] = picked;
        append({ kind: 'user', text: picked });
        if (picked.includes('照片') && !picked.includes('暂无')) {
          append({ kind: 'img', label: '现场照片' });
        }
        await sleep(300);
        continue;
      }
      if ('cardFn' in node) {
        append({ kind: 'card', card: node.cardFn(ctx) });
        await sleep(400);
        continue;
      }
      if ('card' in node) {
        append({ kind: 'card', card: node.card });
        await sleep(400);
        continue;
      }
      if ('avail' in node) {
        append({ kind: 'avail', avail: node.avail });
        await sleep(450);
        continue;
      }
      if ('menuFn' in node) {
        append({ kind: 'menu', menu: node.menuFn(ctx) });
        await sleep(450);
        continue;
      }
      if ('menu' in node) {
        append({ kind: 'menu', menu: node.menu });
        await sleep(450);
        continue;
      }
      if ('infoPanelFn' in node) {
        const panel = node.infoPanelFn(ctx);
        if (panel) {
          append({ kind: 'info', info: panel });
          await sleep(450);
        }
        continue;
      }
      if ('infoPanel' in node) {
        append({ kind: 'info', info: node.infoPanel });
        await sleep(450);
        continue;
      }
      if ('goHome' in node && node.goHome) {
        await sleep(500);
        if (my !== abort.current) return;
        goHome();
        return;
      }
      if ('medSlotsFn' in node) {
        append({ kind: 'med', med: node.medSlotsFn(ctx) });
        await sleep(450);
        continue;
      }
      if ('medSlots' in node) {
        append({ kind: 'med', med: node.medSlots });
        await sleep(450);
        continue;
      }
      if ('resultFn' in node) {
        append({ kind: 'result', text: node.resultFn(ctx) });
        await sleep(400);
        continue;
      }
      if ('result' in node) {
        append({ kind: 'result', text: tpl(node.result, ctx) });
        await sleep(400);
        continue;
      }
      if ('createOrderFn' in node) {
        await submitOrder(node.createOrderFn(ctx));
        await sleep(400);
        continue;
      }
      if ('createOrder' in node) {
        await submitOrder(node.createOrder);
        await sleep(400);
      }
    }
    setBusy(false);
    setAwaitingText(false);
  }

  function waitPick(opts: string[], pick: string, my: number): Promise<string> {
    return new Promise((resolve) => {
      const id = `opt-${Date.now()}`;
      append({ kind: 'opts', opts, pick: id });
      const onPick = (v: string) => {
        window.removeEventListener(id, handler as EventListener);
        resolve(v);
      };
      const handler = (e: Event) => onPick((e as CustomEvent).detail);
      window.addEventListener(id, handler as EventListener);
      const timer = setTimeout(() => {
        if (my === abort.current) onPick(pick || opts[0]);
      }, 4000);
      // store cleanup on abort
      const check = setInterval(() => {
        if (my !== abort.current) {
          clearTimeout(timer);
          clearInterval(check);
          window.removeEventListener(id, handler as EventListener);
        }
      }, 200);
      // monkey: ChatView will dispatch custom event with id as pick field
      (window as unknown as { __optResolve?: Record<string, (v: string) => void> }).__optResolve =
        (window as unknown as { __optResolve?: Record<string, (v: string) => void> }).__optResolve || {};
      (window as unknown as { __optResolve: Record<string, (v: string) => void> }).__optResolve[id] = (v) => {
        clearTimeout(timer);
        clearInterval(check);
        onPick(v);
      };
    });
  }

  async function play(key: string) {
    const sc = scenarios[key];
    if (!sc) return;
    await runScenario(sc);
  }

  async function sendText(raw: string) {
    const t = raw.trim();
    if (!t) return;

    // 场景采集中：把输入交给当前 waitText
    if (textWaiter.current && textWaiter.current.my === abort.current) {
      setText('');
      textWaiter.current.resolve(t);
      return;
    }

    if (busy) return;
    setText('');
    const my = ++abort.current;
    setBusy(true);
    setShowStepper(true);
    setMsgs([{ kind: 'time', text: '今天' }, { kind: 'user', text: t }]);
    await sleep(300);
    if (my !== abort.current) return;

    // progress / order status query
    if (isOrderStatusQuery(t)) {
      try {
        const list = await api.orders();
        const byNo = list.find((o) => t.includes(o.no));
        const hit = byNo || list.find((o) => o.status !== 'ok') || list[0];
        if (hit) {
          append({ kind: 'bot', text: `帮您查到工单 ${hit.no} 的最新进度 👇` });
          append({
            kind: 'card',
            card: {
              title: hit.title,
              no: hit.no,
              status: [hit.status, hit.statusText],
              rows: hit.detail.rows.slice(0, 4),
              track: hit.detail.timeline.map((x) => x.txt),
              on: Math.max(0, hit.detail.timeline.findIndex((x) => x.cur)),
            },
          });
          append({ kind: 'result', text: `📍 当前状态：${hit.statusText}\n${hit.summary}` });
        } else {
          append({
            kind: 'bot',
            text: '您还没有工单，可以先点选下面事项办理',
          });
        }
      } catch {
        append({ kind: 'bot', text: '暂时查不到工单信息，请稍后再试' });
      }
      setBusy(false);
      return;
    }

    const key = recognizeIntent(t);
    if (key && scenarios[key]) {
      append({ kind: 'bot', text: `🔍 听懂啦～您是想「${scenarios[key].name}」，我来帮您办理 👇` });
      setStep(1);
      await sleep(500);
      if (my !== abort.current) return;
      await runScenario(scenarios[key], true);
      return;
    }

    const maybeWeather = /天气|气温|温度|下雨|冷不冷|热不热|穿什么|紫外线/.test(t);
    const maybeInstant = /(几号|日期|星期|几点|节气|现在什么时候)/.test(t);
    append({
      kind: 'searching',
      text: maybeWeather ? '正在获取实时天气…' : maybeInstant ? '正在查询…' : '正在思考…',
    });
    const ans = await answerGeneral(t);
    if (my !== abort.current) return;
    setMsgs((prev) => prev.filter((m) => m.kind !== 'searching'));
    if (ans.type === 'greet') {
      append({ kind: 'bot', text: ans.text });
    } else if (ans.type === 'weather') {
      append({ kind: 'weather', loading: true });
      try {
        const data = await fetchLiveWeather();
        if (my !== abort.current) return;
        setMsgs((prev) =>
          prev.map((m) => (m.kind === 'weather' && m.loading ? { kind: 'weather', data } : m)),
        );
        append({ kind: 'bot', text: '需要我帮您查别的日期，或看看农事建议吗？' });
      } catch {
        if (my !== abort.current) return;
        setMsgs((prev) =>
          prev.map((m) =>
            m.kind === 'weather' && m.loading
              ? { kind: 'weather', error: '暂时查不到天气，请稍后再试' }
              : m,
          ),
        );
      }
    } else if (ans.type === 'fact') {
      append({ kind: 'bot', text: ans.text });
      append({ kind: 'bot', text: '办村里的事也可以直接跟我说～' });
    } else if (ans.type === 'knowledge') {
      append({
        kind: 'bot',
        text: `${ans.title}\n${ans.body}\n\n${ans.source}`,
      });
    } else {
      append({
        kind: 'bot',
        text: '这个问题我暂时答不准，您可以换个问法，或告诉我要办的事（报修、反映问题、问政策等）。也可以点选下面的事项：',
      });
      append({
        kind: 'opts',
        opts: Object.values(scenarios).slice(0, 6).map((s) => `${s.icon} ${s.name}`),
      });
    }
    setBusy(false);
    setShowStepper(false);
  }

  function onOptClick(label: string, pickId?: string) {
    if (pickId && (window as unknown as { __optResolve?: Record<string, (v: string) => void> }).__optResolve?.[pickId]) {
      (window as unknown as { __optResolve: Record<string, (v: string) => void> }).__optResolve[pickId](label);
      setMsgs((prev) => prev.filter((m) => !(m.kind === 'opts' && m.pick === pickId)));
      return;
    }
    // welcome / fallback chips
    const hit = Object.values(scenarios).find((s) => label.includes(s.name));
    if (hit) play(hit.key);
    else sendText(label.replace(/^💬\s*/, ''));
  }

  function showVoiceUnsupported() {
    append({ kind: 'bot', text: '当前浏览器不支持语音输入，请改用文字' });
  }

  function stopVoiceSession() {
    voiceRef.current?.stop();
    voiceRef.current = null;
  }

  function startVoiceSession() {
    if (!isSpeechRecognitionSupported()) {
      showVoiceUnsupported();
      return;
    }
    if (voiceRef.current) return;

    setListening(true);
    setInterimText('');

    const rec = createVoiceRecognizer({
      onInterim: (t) => setInterimText(t),
      onEnd: (final) => {
        voiceRef.current = null;
        setListening(false);
        setInterimText('');
        if (final) sendText(final);
      },
      onError: (msg) => {
        voiceRef.current = null;
        setListening(false);
        setInterimText('');
        if (msg) append({ kind: 'bot', text: msg });
      },
    });

    voiceRef.current = rec;
    rec.start();
  }

  function clearPressTimer() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  /** Touch: long-press to hold-to-talk. Desktop: long-press or short click toggles. */
  function onMicPressStart(fromTouch: boolean) {
    if (fromTouch) touchUsedRef.current = true;
    else if (touchUsedRef.current) return;

    longPressActiveRef.current = false;
    clearPressTimer();
    pressTimerRef.current = setTimeout(() => {
      longPressActiveRef.current = true;
      startVoiceSession();
    }, LONG_PRESS_MS);
  }

  function onMicPressEnd(fromTouch: boolean) {
    if (fromTouch) {
      touchUsedRef.current = true;
      window.setTimeout(() => {
        touchUsedRef.current = false;
      }, 400);
    } else if (touchUsedRef.current) return;

    clearPressTimer();

    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      stopVoiceSession();
      return;
    }

    // Desktop short click: toggle listen on/off
    if (!fromTouch) {
      if (listening) stopVoiceSession();
      else startVoiceSession();
    }
  }

  function onMicPressCancel() {
    clearPressTimer();
    longPressActiveRef.current = false;
  }

  function onAttach(file: File | null) {
    if (!file) return;
    setShowStepper(false);
    setMsgs([
      { kind: 'time', text: '今天' },
      { kind: 'img', label: file.name },
      { kind: 'bot', text: '收到您的图片啦～请问这张照片是要办哪件事？' },
      {
        kind: 'opts',
        opts: ['📋 反映问题', '🔧 设施报修', '🏛️ 礼堂预约', '🎓 技能咨询', '🏥 医疗挂号'],
      },
    ]);
  }

  const featuredKeys = services.filter((s) => s.featured).map((s) => s.key);
  const homeKeys = (featuredKeys.length ? featuredKeys : HOME_FEATURED).slice(0, 7);
  const allKeys = (services.length ? services.map((s) => s.key) : Object.keys(scenarios)).filter(
    (k) => scenarios[k],
  );
  const gridKeys = showAll ? allKeys : homeKeys;

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <h1>AI 村小二</h1>
        <div className="sub">对话即服务 · 村民便民完整应用</div>
        <div className="link" onClick={() => setDocOpen(true)}>📄 查看需求文档</div>
        <a className="link" href="/admin">⚙️ 管理后台</a>
        <div className="link" onClick={() => nav('/my')}>👤 我的工单</div>
      </aside>

      <div className="phone">
        <div className="screen">
          <div className="statusbar">
            <span>9:00</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="status-doc" onClick={() => setDocOpen(true)}>📄 需求文档</span>
              <span>5G 100%</span>
            </div>
          </div>
          <div className="navbar">
            <button className={`back-btn ${msgs[0]?.kind === 'welcome' ? '' : 'show'}`} onClick={goHome}>‹</button>
            <div className="avatar">🤖</div>
            <div className="tt">
              <div className="n">AI 村小二</div>
              <div className="s"><span className="dot-online" /> 在线 · 7×24 为您服务</div>
            </div>
            <button className="my-btn" onClick={() => nav('/my')}>👤 我的</button>
          </div>

          {showStepper && (
            <div className="stepper">
              {(['识别', '确认', '采集', '摘要', '生单', '反馈'] as const).map((lbl, i) => {
                const n = (i + 1) as Step;
                return (
                  <div key={lbl} className={`step ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
                    <div className="circle">{n}</div>
                    <div className="lbl">{lbl}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="chat" ref={chatRef}>
            {msgs.map((m, i) => {
              if (m.kind === 'welcome') {
                return (
                  <div className="welcome" key={i}>
                    <div className="hi">
                      <div style={{ fontSize: 22 }}>🤖</div>
                      <div>
                        您好，我是 <b>AI 村小二</b>，您的乡村生活助手！
                        <br />下面这些事我都能帮您办，点一下开始，或直接对我说话 👇
                      </div>
                    </div>
                    <div className="grid">
                      {gridKeys.map((k) => {
                        const s = scenarios[k];
                        if (!s) return null;
                        return (
                          <button key={k} className="g" onClick={() => play(k)} disabled={busy}>
                            <span className="ic">{s.icon}</span>
                            <span className="nm">{s.name}</span>
                          </button>
                        );
                      })}
                      <button className="g more" onClick={() => setShowAll((v) => !v)}>
                        <span className="ic">{showAll ? '⬆️' : '➕'}</span>
                        <span className="nm">{showAll ? '收起' : '更多'}</span>
                      </button>
                    </div>
                    <div className="ask-hi">💬 也可以随便问我：天气、节气农事、百科常识等日常问题～</div>
                    <div className="options flat">
                      {['今天天气怎么样', '今天几号', '现在是什么节气'].map((q) => (
                        <div key={q} className="opt" onClick={() => sendText(q)}>💬 {q}</div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (m.kind === 'time') return <div className="time-tip" key={i}>{m.text}</div>;
              if (m.kind === 'bot')
                return (
                  <div className="msg bot" key={i}>
                    <div className="av">🤖</div>
                    <div className="bubble">{m.text}</div>
                  </div>
                );
              if (m.kind === 'user')
                return (
                  <div className="msg user" key={i}>
                    <div className="av">👤</div>
                    <div className="bubble">{m.text}</div>
                  </div>
                );
              if (m.kind === 'img')
                return (
                  <div className="msg user" key={i}>
                    <div className="av">👤</div>
                    <div className="img-bubble">🖼️<small>{m.label}</small></div>
                  </div>
                );
              if (m.kind === 'opts')
                return (
                  <div className="options" key={i}>
                    {m.opts.map((o) => (
                      <div key={o} className="opt" onClick={() => onOptClick(o, m.pick)}>{o}</div>
                    ))}
                  </div>
                );
              if (m.kind === 'result') return <div className="result-tip" key={i}>{m.text}</div>;
              if (m.kind === 'searching') return <div className="searching" key={i}>🔍 {m.text}</div>;
              if (m.kind === 'weather') {
                if (m.loading) {
                  return (
                    <div className="weather-card" key={i}>
                      <div className="wc-h">
                        <div>
                          <div>📍 定位中…</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>正在获取实时天气</div>
                        </div>
                        <div style={{ fontSize: 36 }}>⏳</div>
                      </div>
                      <div className="wc-temp" style={{ fontSize: 16, fontWeight: 500 }}>加载中…</div>
                      <div className="wc-src">数据来源：Open-Meteo 实时天气</div>
                    </div>
                  );
                }
                if (m.error || !m.data) {
                  return (
                    <div className="weather-card" key={i}>
                      <div className="wc-h">
                        <div>
                          <div>📍 天气</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>实时</div>
                        </div>
                        <div style={{ fontSize: 36 }}>🌡️</div>
                      </div>
                      <div className="wc-temp" style={{ fontSize: 16, fontWeight: 500 }}>
                        {m.error || '暂时查不到天气，请稍后再试'}
                      </div>
                      <div className="wc-src">数据来源：Open-Meteo 实时天气</div>
                    </div>
                  );
                }
                const w = m.data;
                const range =
                  w.low != null && w.high != null ? `${w.low}~${w.high}℃` : null;
                return (
                  <div className="weather-card" key={i}>
                    <div className="wc-h">
                      <div>
                        <div>📍 {w.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.85 }}>实时</div>
                      </div>
                      <div style={{ fontSize: 36 }}>{w.emoji}</div>
                    </div>
                    <div className="wc-temp">
                      {w.temp}℃{' '}
                      <small style={{ fontSize: 14, fontWeight: 400 }}>{w.condition}</small>
                    </div>
                    <div className="wc-meta">
                      {range && <span>{range}</span>}
                      <span>{w.windLabel}</span>
                      <span>湿度 {w.humidity}%</span>
                    </div>
                    <div className="wc-tip">{w.tip}</div>
                    <div className="wc-src">数据来源：Open-Meteo 实时天气</div>
                  </div>
                );
              }
              if (m.kind === 'card') {
                const c = m.card;
                return (
                  <div className="card" key={i}>
                    <div className="card-h"><span>📄 {c.title}</span><span style={{ fontSize: 11, opacity: .9 }}>{c.no}</span></div>
                    <div className="card-b">
                      <span className={`badge ${c.status[0]}`}>{c.status[1]}</span>
                      {c.rows.map((r) => (
                        <div className="row" key={r[0]}><div className="k">{r[0]}</div><div>{r[1]}</div></div>
                      ))}
                    </div>
                    <div className="track">
                      {c.track.map((t, ti) => (
                        <div className={`ts ${ti <= c.on ? 'on' : ''}`} key={t}><div className="d" />{t}</div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (m.kind === 'avail') {
                const a = m.avail;
                return (
                  <div className="avail-card" key={i}>
                    <div className="ac-h">{a.title}</div>
                    <div className="ac-b">
                      {a.sections.map((s) => (
                        <div key={s.name}>
                          <div style={{ fontWeight: 600, margin: '6px 0 4px' }}>{s.name}</div>
                          {s.slots.map((x) => (
                            <div className="slot" key={x.nm}><span>{x.nm}</span><span className={`st ${x.st}`}>{x.label}</span></div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {a.tip && <div className="mc-tip">{a.tip}</div>}
                  </div>
                );
              }
              if (m.kind === 'menu') {
                const menu = m.menu;
                return (
                  <div className="menu-card" key={i}>
                    <div className="mc-h">{menu.title}</div>
                    <div className="mc-b">
                      {menu.cats.map((c) => (
                        <div key={c.name}><div className="cat">{c.name}</div><div>{c.items}</div></div>
                      ))}
                    </div>
                    {menu.tip && <div className="mc-tip">{menu.tip}</div>}
                  </div>
                );
              }
              if (m.kind === 'info') {
                const p = m.info;
                return (
                  <div className="info-panel" key={i}>
                    <div className="ip-h"><div className="t">{p.title}</div><div className="s">{p.sub}</div></div>
                    <div className="ip-b">
                      {p.body && <div dangerouslySetInnerHTML={{ __html: p.body }} />}
                      {p.cadres?.map((c) => (
                        <div className="cadre" key={c.name}>
                          <div className="av">{c.av}</div>
                          <div><div className="n">{c.name}</div><div className="r">{c.role} · {c.phone}</div></div>
                        </div>
                      ))}
                      {p.communities?.map((c) => (
                        <div className="comm" key={c.name}><b>{c.name}</b> · 网格长 {c.lead} · {c.households}</div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (m.kind === 'med') {
                return (
                  <div className="med-slots" key={i}>
                    <div className="ms-h">{m.med.title}</div>
                    <div className="ms-b">
                      {m.med.slots.map((s) => (
                        <div className="slot-row" key={s.nm}><span>{s.nm}</span><span className={`st ${s.st}`}>{s.label}</span></div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <div className={`listen ${listening ? 'show' : ''}`}>
            <div className="box">
              <div style={{ fontSize: 15, marginBottom: 6 }}>正在聆听…</div>
              {interimText && (
                <div style={{ fontSize: 13, marginBottom: 6, minHeight: 20 }}>{interimText}</div>
              )}
              <div style={{ fontSize: 11, opacity: .85 }}>松开结束 · 说出您的问题</div>
            </div>
          </div>

          <div className="inputbar">
            <button
              type="button"
              title="长按说话（手机）/ 点击切换（电脑）"
              onTouchStart={(e) => {
                e.preventDefault();
                onMicPressStart(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onMicPressEnd(true);
              }}
              onTouchCancel={() => {
                onMicPressCancel();
                if (listening) stopVoiceSession();
              }}
              onMouseDown={() => onMicPressStart(false)}
              onMouseUp={() => onMicPressEnd(false)}
              onMouseLeave={() => {
                if (longPressActiveRef.current) {
                  onMicPressCancel();
                  stopVoiceSession();
                } else {
                  onMicPressCancel();
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              🎙️
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText(text)}
              placeholder={inputHint}
              disabled={busy && showStepper && !awaitingText}
            />
            <label className="attach-btn" title="附件" style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" hidden onChange={(e) => { onAttach(e.target.files?.[0] || null); e.target.value = ''; }} />
              <span style={{
                width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>📎</span>
            </label>
            <button className="send" type="button" onClick={() => sendText(text)} disabled={busy && showStepper && !awaitingText}>➤</button>
          </div>
        </div>
      </div>

      <div className={`doc-modal ${docOpen ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && setDocOpen(false)}>
        <div className="doc-panel">
          <div className="doc-h">
            <div>📄 AI 村小二 · 需求文档摘要</div>
            <button type="button" onClick={() => setDocOpen(false)}>×</button>
          </div>
          <div className="doc-body" dangerouslySetInnerHTML={{ __html: docHtml }} />
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInline(s: string) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Minimal markdown → HTML for the requirements modal (headers, lists, paragraphs). */
function renderDocMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      closeList();
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s*/, '');
      const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      out.push(`<${tag}>${formatInline(text)}</${tag}>`);
    } else if (/^[-*·•]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${formatInline(line.replace(/^[-*·•]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      closeList();
      out.push(`<p class="doc-step">${formatInline(line)}</p>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${formatInline(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

/** Inline fallback if `/docs/需求文档摘要.md` cannot be fetched. */
const DOC_SUMMARY = `# AI 村小二 · 需求文档摘要

Slogan：「有问题，问村小二」— 您的 AI 乡村生活助手

## 一、产品定位与原则

定位：以 AI 村小二 为核心入口的村民便民服务应用。

原则：对话即服务 — 群众用说话 / 打字 / 附件描述需求，AI 理解意图后提供咨询、导引、代办填报、问题上报等服务。

要解决的痛点：
- 功能多、菜单复杂，老人不会用 → 一个对话框搞定
- 不知道找哪个模块 → AI 自动识别意图
- 政策文件看不懂 → 大白话解读本地政策
- 有问题不知道找谁 → AI 引导填报并生成结构化工单
- 服务分散在多个小程序 → 统一入口串联便民服务
- 干部下班无人回应 → AI 7×24 先应答，复杂问题转人工

## 二、核心架构与六步办事流程

架构：村民输入 → AI 村小二（意图识别 / 多轮对话 / 知识问答 / 工单生成）→ 咨询 / 反馈 / 交易 / 活动 / 链接类服务 → 轻量管理后台。

首页：两排服务卡片（4×2，末格「更多」）+ 示例提问气泡；点选卡片或自由描述均可进入办事。

六步办事（办事类统一流程）：
1. 识别场景 — 点选或话术匹配服务，加载提问模板
2. 确认事项 — AI 复述理解，用户确认 / 纠正
3. 采集信息 — 按模板逐项追问（一次一问，可预填，可语音 / 拍照）
4. 确认摘要 — 汇总核对，可修改单项
5. 自动生单 — 校验必填后写入工单并派单 / 审核
6. 反馈结果 — 告知单号、时效；可查进度、可评价

非办事类（天气、百科等）即问即答，不强制生单。

## 三、三种输入方式

- 打字：底部输入框，回车或点发送
- 语音：长按麦克风说话（演示可模拟 ASR），适合老人
- 附件：回形针上传图片，AI 引导选择对应办事场景

## 四、十二场景详细说明

### 1. 反映问题
环境卫生、道路破损、噪音扰民、违建、邻里纠纷等上报。
流程：选类型 → 位置与描述 → 建议拍照 → 是否匿名 → 确认摘要 → 生成问题反馈工单（FK）。
派单按类型到环卫 / 基建 / 网格员；普通约 48 小时，安全隐患优先；办结后可回访。

### 2. 设施报修
路灯、健身器材、垃圾桶、监控等公共设施故障报修。
流程：设施类型 → 位置 → 故障描述 → 现场照片 → 联系方式 → 生成报修工单（BX）。
按设施类型派维修责任人；一般约 24 小时，影响安全立即响应；维修完成可上传照片关单。

### 3. 卖农产品
村民上架农产品、手工艺品、闲置物品。
流程：品名 → 品类 / 数量规格 → 期望价格 → 商品照片 → 联系方式 → 生成上架审核单（SP）。
村委审核通过后上架村民商城；审核一般当天完成，通过后通知卖家。

### 4. 政策咨询
养殖补贴、创业扶持、培训补贴、低保医保等政策问询。
流程：描述个人情况 → AI 追问关键条件 → 知识库检索并用大白话解读办理地点与材料。
通常不生单；可说「帮我预约去村委会」转预约服务单（YY）。

### 5. 技能咨询
电商、手工艺、驾驶、养殖加工等技能学习与培训咨询。
流程：意向技能 → 现有基础 → 时间偏好 → 匹配镇/村课程与技能达人 → 可一键生成培训报名单（PX）。
默认 RAG 答复 + 资源推荐；确认报名后开班提醒。

### 6. 找活干
村民求职、了解附近招工信息。
流程：年龄 → 技能 / 经验 → 期望工种与全职兼职 → 联系方式 → 求职登记单（QZ）。
AI 匹配招聘岗位展示；用户选中后可生成投递记录，由企业 / 村委对接。

### 7. 老年订餐
查看老年食堂菜单、预订次日餐食，可选送餐上门。
流程：订餐日期 → 套餐选择 → 份数 → 是否送餐 → 联系人 → 订餐确认单（DC）。
同步食堂侧确认取餐 / 配送；可取餐提醒与评价。

### 8. 邻里互助
搬家求助、借工具、临时照看、闲置交换等。
流程：需求类型 → 具体描述 → 期望时间与地点 → 联系方式 → 互助需求单（HZ）。
公开发布到邻里圈，AI 可推荐可能帮忙的邻居；完成后双方确认，可记积分。

### 9. 礼堂预约
红白喜事及家宴：预约文化礼堂场地、厨师与菜单。
流程：宴席类型 → 日期 / 午晚场 → 桌数 → 查场地与厨师档期 → 选厨师 → 菜单套餐可调 → 确认 → 礼堂预约单（LT）。
村委礼堂管理员与厨师确认后锁定档期；白事等紧急预约优先协调。

### 10. 医疗挂号
预约乡镇卫生院 / 县级医院科室号源。
流程：挂号 / 查院 → 医院与科室 → 查余号时段 → 就诊人信息 → 预约挂号单（GH）。
就诊前提醒到院取号；可与健康咨询互相跳转。

### 11. 健康咨询
常见症状了解、用药提醒、是否需要就医导引（含免责声明）。
流程：症状描述 → 追问年龄 / 用药史等 → 大白话建议；紧急引导拨打 120。
通常不生单；可说「帮我挂号」转入医疗挂号流程。

### 12. 村务公开
村概况、班子成员、村社网格、村约村规等公开信息查询（示例：长兴县龙溪村）。
流程：点选或询问类别 → 结构化面板展示 → 可一键联系 / 预约村干部。
不生单；信息由后台村务公开模块维护更新。

## 五、我的 · 工单中心

入口：右上角「我的」。
能力：用户信息与进行中 / 待确认 / 已完成统计；分类筛选；工单卡片列表；详情含完整字段与处理进度时间线。
联动：详情可「问 AI 查进度」；对话中说单号或「进度怎么样了」即可查状态。

## 六、管理后台模块

路径前缀 /admin（登录 /admin/login）。
- 概览：后台首页
- 工单：受理 / 完成问题、报修、预约等工单
- 村务公开：村概况、班子、网格、村规维护
- 服务配置：服务开关与首页展示项、采集模板
- 知识库：政策 / FAQ 等知识条目 CRUD

## 七、通用问答

- 今日天气：温度、风力、湿度、农事 / 生活建议
- 百科常识：节气、保存方法等，大白话 + 来源标注
- 联网搜索摘要：其它日常疑问
- 闲聊问候：自然回应并引导可办事项

## 八、完整文档路径（仓库 docs/）

- docs/未来乡村AI版-便民服务需求清单.md — 唯一需求文档（十二场景、六步、工单、后台与分期；附录含九场景功能域梳理）
- docs/README.md — 指向上述需求清单的入口说明
- docs/未来乡村AI版-技术框架与成本预算.html — 技术选型与成本
- docs/未来乡村AI版原型.html — 对话办事交互原型
- docs/AI村小二-产品演示-3.pptx — 产品演示文稿
- README.md — 工程说明与功能列表

在线演示：https://ai-cunxiaoer.onrender.com`;
