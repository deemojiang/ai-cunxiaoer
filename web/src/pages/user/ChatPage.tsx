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
          <div className="doc-body">{DOC_SUMMARY}</div>
        </div>
      </div>
    </div>
  );
}

const DOC_SUMMARY = `未来乡村 AI 版 · 便民服务需求清单（摘要）

定位：以 AI 村小二 为核心入口的村民便民服务应用
原则：对话即服务 — 群众用说话/打字提问，AI 理解意图后提供咨询、导引、代办填报、问题上报等服务

核心能力：
· 首页两排服务卡片 +「更多」
· 打字 / 语音（长按说话）/ 附件三种输入
· 十二场景六步办事流程（识别→确认→采集→摘要→生单→反馈）
· 通用问答（天气、百科、知识库）
· 我的工单中心（分类、详情、进度）
· 管理后台（工单、村务、服务配置、知识库）

默认首页场景：反映问题、设施报修、卖农产品、政策咨询、礼堂预约、医疗挂号、村务公开、更多

完整文档见原目录：未来乡村ai版/README.md`;
