import { useEffect, useState } from 'react';
import { api, type Order } from '../../api/client';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => api.adminOrders().then(setOrders).catch((e) => setMsg(e.message));
  useEffect(() => {
    load();
  }, []);

  async function update(o: Order, status: Order['status'], statusText: string) {
    try {
      await api.patchOrder(o.id, { status, statusText, note: `管理员更新：${statusText}` });
      setMsg(`已更新 ${o.no}`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>工单中心</h2>
      {msg && <div style={{ marginBottom: 10, color: '#1f7a44', fontSize: 13 }}>{msg}</div>}
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
              <tr key={o.id}>
                <td>{o.no}</td>
                <td>
                  {o.icon} {o.title}
                </td>
                <td>{o.summary}</td>
                <td>
                  <span className={`badge ${o.status}`}>{o.statusText}</span>
                </td>
                <td>{o.time}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn sm" onClick={() => update(o, 'doing', '处理中')}>
                    受理
                  </button>
                  <button className="btn sm ghost" onClick={() => update(o, 'ok', '已完成')}>
                    完成
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
