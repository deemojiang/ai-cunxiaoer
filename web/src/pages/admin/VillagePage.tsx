import { useEffect, useState } from 'react';
import { api, type Village } from '../../api/client';

export default function VillagePage() {
  const [v, setV] = useState<Village | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.village().then(setV);
  }, []);

  if (!v) return <div>加载中…</div>;

  async function save() {
    try {
      const next = await api.putVillage(v!);
      setV(next);
      setMsg('已保存');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>村务公开（{v.name}）</h2>
      {msg && <div style={{ marginBottom: 10, color: '#1f7a44' }}>{msg}</div>}
      <div className="admin-card">
        <h3>基本信息</h3>
        <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          村名
          <input
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6' }}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          简介
          <textarea
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6', minHeight: 80 }}
            value={v.intro}
            onChange={(e) => setV({ ...v, intro: e.target.value })}
          />
        </label>
        <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          地址 / 热线 / 办公时间
          <input
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6' }}
            value={`${v.address} | ${v.hotline} | ${v.hours}`}
            onChange={(e) => {
              const [address, hotline, hours] = e.target.value.split('|').map((s) => s.trim());
              setV({ ...v, address: address || v.address, hotline: hotline || v.hotline, hours: hours || v.hours });
            }}
          />
        </label>
        <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          村约村规（HTML）
          <textarea
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6', minHeight: 120 }}
            value={v.rulesHtml}
            onChange={(e) => setV({ ...v, rulesHtml: e.target.value })}
          />
        </label>
        <button className="btn" onClick={save}>
          保存
        </button>
      </div>
      <div className="admin-card">
        <h3>班子成员（只读列表）</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.8 }}>
          {v.cadres.map((c) => (
            <li key={c.name}>
              {c.av} {c.name} — {c.role} — {c.phone}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
