import { useEffect, useState } from 'react';
import { api, type Order } from '../../api/client';

type ActionKind = 'accept' | 'complete';

const ACTION_CFG: Record<
  ActionKind,
  { title: string; status: Order['status']; statusText: string; confirmLabel: string }
> = {
  accept: { title: '受理工单', status: 'doing', statusText: '处理中', confirmLabel: '确认受理' },
  complete: { title: '完成工单', status: 'ok', statusText: '已完成', confirmLabel: '确认完成' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState('');
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<{ kind: ActionKind; order: Order } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.adminOrders().then(setOrders).catch((e) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);

  async function openDetail(o: Order) {
    setDetail(o);
    setDetailLoading(true);
    try {
      const fresh = await api.order(o.id);
      setDetail(fresh);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }

  function openAction(kind: ActionKind, order: Order) {
    setAction({ kind, order });
    setNote('');
  }

  function closeAction() {
    if (submitting) return;
    setAction(null);
    setNote('');
  }

  async function confirmAction() {
    if (!action) return;
    const opinion = note.trim();
    if (!opinion) {
      setMsg('请填写办理意见');
      return;
    }
    const cfg = ACTION_CFG[action.kind];
    setSubmitting(true);
    try {
      await api.patchOrder(action.order.id, {
        status: cfg.status,
        statusText: cfg.statusText,
        note: `${cfg.statusText}：${opinion}`,
      });
      setMsg(`已${action.kind === 'accept' ? '受理' : '完成'} ${action.order.no}`);
      setAction(null);
      setNote('');
      if (detail?.id === action.order.id) {
        const fresh = await api.order(action.order.id);
        setDetail(fresh);
      }
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>工单中心</h2>
      {msg && <div className="admin-toast">{msg}</div>}
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>单号</th>
              <th>类型</th>
              <th>摘要</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="admin-row-click" onClick={() => openDetail(o)}>
                <td>
                  <button
                    type="button"
                    className="admin-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(o);
                    }}
                  >
                    {o.no}
                  </button>
                </td>
                <td>
                  {o.icon} {o.title}
                </td>
                <td>{o.summary}</td>
                <td>
                  <span className={`badge ${o.status}`}>{o.statusText}</span>
                </td>
                <td>{o.time}</td>
                <td>
                  <div className="admin-ops" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={o.status === 'doing' || o.status === 'ok'}
                      onClick={() => openAction('accept', o)}
                    >
                      受理
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={o.status === 'ok'}
                      onClick={() => openAction('complete', o)}
                    >
                      完成
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#8a8a8a', padding: 28 }}>
                  暂无工单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="admin-drawer-mask"
          onClick={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <aside className="admin-drawer" role="dialog" aria-label="工单详情">
            <div className="admin-drawer-h">
              <div>
                <div className="admin-drawer-title">
                  {detail.icon} {detail.title}{' '}
                  <span className={`badge ${detail.status}`}>{detail.statusText}</span>
                </div>
                <div className="admin-drawer-sub">
                  {detail.no} · {detail.type || detail.title} · {detail.time}
                </div>
              </div>
              <button type="button" className="admin-drawer-close" onClick={() => setDetail(null)}>
                ×
              </button>
            </div>
            <div className="admin-drawer-body">
              {detailLoading && <div className="admin-muted">加载中…</div>}
              <div className="admin-section">
                <div className="admin-section-t">摘要</div>
                <p>{detail.summary || '—'}</p>
              </div>
              <div className="admin-section">
                <div className="admin-section-t">详细信息</div>
                {detail.detail.rows.length ? (
                  detail.detail.rows.map((r) => (
                    <div className="admin-kv" key={r[0]}>
                      <div className="k">{r[0]}</div>
                      <div className="v">{r[1]}</div>
                    </div>
                  ))
                ) : (
                  <div className="admin-muted">暂无字段</div>
                )}
              </div>
              <div className="admin-section">
                <div className="admin-section-t">处理进度</div>
                {detail.detail.timeline.map((t, i) => (
                  <div className={`admin-tl ${t.cur ? 'cur' : ''}`} key={`${t.t}-${i}`}>
                    {t.txt}
                    <div className="ts">{t.t}</div>
                  </div>
                ))}
              </div>
              <div className="admin-ops" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  disabled={detail.status === 'doing' || detail.status === 'ok'}
                  onClick={() => openAction('accept', detail)}
                >
                  受理
                </button>
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={detail.status === 'ok'}
                  onClick={() => openAction('complete', detail)}
                >
                  完成
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {action && (
        <div
          className="admin-modal-mask"
          onClick={(e) => e.target === e.currentTarget && closeAction()}
        >
          <div className="admin-modal" role="dialog" aria-label={ACTION_CFG[action.kind].title}>
            <div className="admin-modal-h">
              <h3>{ACTION_CFG[action.kind].title}</h3>
              <button type="button" className="admin-drawer-close" onClick={closeAction}>
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-muted" style={{ marginBottom: 10 }}>
                工单 {action.order.no} · {action.order.title}
              </p>
              <label className="admin-label" htmlFor="admin-order-note">
                办理意见 <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <textarea
                id="admin-order-note"
                className="admin-textarea"
                placeholder="请填写办理意见（必填）"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
            <div className="admin-modal-f">
              <button type="button" className="btn ghost" disabled={submitting} onClick={closeAction}>
                取消
              </button>
              <button type="button" className="btn" disabled={submitting} onClick={confirmAction}>
                {submitting ? '提交中…' : ACTION_CFG[action.kind].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
