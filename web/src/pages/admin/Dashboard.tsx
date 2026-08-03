import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Order } from '../../api/client';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    api.adminOrders().then(setOrders).catch(() => setOrders([]));
  }, []);
  const wait = orders.filter((o) => o.status === 'wait').length;
  const doing = orders.filter((o) => o.status === 'doing').length;
  const ok = orders.filter((o) => o.status === 'ok').length;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>概览</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="admin-card" style={{ flex: 1 }}>
          <div style={{ color: '#8a8a8a', fontSize: 13 }}>待确认</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#d98a00' }}>{wait}</div>
        </div>
        <div className="admin-card" style={{ flex: 1 }}>
          <div style={{ color: '#8a8a8a', fontSize: 13 }}>处理中</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#2478d9' }}>{doing}</div>
        </div>
        <div className="admin-card" style={{ flex: 1 }}>
          <div style={{ color: '#8a8a8a', fontSize: 13 }}>已完成</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1f7a44' }}>{ok}</div>
        </div>
      </div>
      <div className="admin-card">
        <h3>快捷入口</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn" to="/admin/orders">处理工单</Link>
          <Link className="btn ghost" to="/admin/village">维护村务</Link>
          <Link className="btn ghost" to="/admin/services">服务配置</Link>
          <Link className="btn ghost" to="/admin/knowledge">知识库</Link>
        </div>
      </div>
    </div>
  );
}
