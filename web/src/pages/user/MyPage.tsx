import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Order, type User } from '../../api/client';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'book', label: '预约' },
  { key: 'feedback', label: '反馈/报修' },
  { key: 'product', label: '上架' },
  { key: 'other', label: '其它' },
];

export default function MyPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState('all');
  const [detail, setDetail] = useState<Order | null>(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser({ id: 'u1', name: '张大叔', phone: '138****1234', group: '老虎洞村 2组' }));
    api.orders().then(setOrders).catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    api.order(id).then(setDetail).catch(() => {
      const hit = orders.find((o) => o.id === id || o.no === id);
      setDetail(hit || null);
    });
  }, [id, orders]);

  const list = tab === 'all' ? orders : orders.filter((o) => o.cat === tab);
  const doing = orders.filter((o) => o.status === 'doing' || o.status === 'wait').length;
  const wait = orders.filter((o) => o.status === 'wait').length;
  const ok = orders.filter((o) => o.status === 'ok').length;

  return (
    <div className="app-shell">
      <div className="phone">
        <div className="screen">
          <div className="statusbar">
            <span>9:00</span>
            <span>5G 100%</span>
          </div>
          <div className="navbar">
            <button className="back-btn show" onClick={() => (detail || id ? nav('/my') : nav('/'))}>‹</button>
            <div className="avatar">🤖</div>
            <div className="tt">
              <div className="n">我的工单</div>
              <div className="s">预约 · 反馈 · 上架进度</div>
            </div>
            <button className="my-btn" onClick={() => nav('/')}>🏠 办事</button>
          </div>

          <div className="chat">
            {!id && !detail && (
              <div className="my-page">
                <div className="my-header">
                  <div className="uav">👤</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>{user?.name || '村民'}</div>
                    <div style={{ fontSize: 12, opacity: 0.88, marginTop: 2 }}>
                      {user?.phone} · {user?.group}
                    </div>
                  </div>
                </div>
                <div className="my-stats">
                  <div className="st"><div className="num">{doing}</div><div className="lbl">进行中</div></div>
                  <div className="st"><div className="num">{wait}</div><div className="lbl">待确认</div></div>
                  <div className="st"><div className="num">{ok}</div><div className="lbl">已完成</div></div>
                </div>
                <div className="my-tabs">
                  {tabs.map((t) => (
                    <div key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
                      {t.label}
                    </div>
                  ))}
                </div>
                {list.map((o) => (
                  <button key={o.id} className="my-item" onClick={() => nav(`/my/${o.id}`)}>
                    <div className="row1">
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>{o.icon}</span>
                        <span className="tit">{o.title}</span>
                      </div>
                      <span className={`badge ${o.status}`}>{o.statusText}</span>
                    </div>
                    <div className="row2">{o.no} · {o.type}</div>
                    <div className="row3">{o.summary}</div>
                    <div className="time">{o.time}</div>
                  </button>
                ))}
                {!list.length && <div style={{ textAlign: 'center', color: '#8a8a8a', padding: 40 }}>暂无此类记录</div>}
              </div>
            )}

            {(detail || (id && detail)) && detail && (
              <div className="my-page">
                <button className="my-back" onClick={() => nav('/my')}>← 返回我的工单</button>
                <div className="my-detail">
                  <div className="md-h">
                    <div className="tit">
                      {detail.icon} {detail.title}{' '}
                      <span className={`badge ${detail.status}`}>{detail.statusText}</span>
                    </div>
                    <div className="no">{detail.no} · {detail.time}</div>
                  </div>
                  <div className="md-b">
                    {detail.detail.rows.map((r) => (
                      <div className="md-row" key={r[0]}>
                        <div className="k">{r[0]}</div>
                        <div>{r[1]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="md-track">
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>处理进度</div>
                    {detail.detail.timeline.map((t, i) => (
                      <div className={`tl ${t.cur ? 'cur' : ''}`} key={i}>
                        {t.txt}
                        <div className="ts">{t.t}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="options flat" style={{ marginTop: 14 }}>
                  <Link className="opt" to={`/?q=${encodeURIComponent(detail.no + '进度怎么样了')}`}>
                    💬 问 AI 查进度
                  </Link>
                  <div className="opt" onClick={() => nav('/')}>🏠 回首页办事</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
