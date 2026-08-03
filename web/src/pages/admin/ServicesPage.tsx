import { useEffect, useState } from 'react';
import { api, type ServiceItem } from '../../api/client';

export default function ServicesPage() {
  const [list, setList] = useState<ServiceItem[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => api.adminServices().then(setList);
  useEffect(() => {
    load();
  }, []);

  async function toggle(s: ServiceItem, field: 'enabled' | 'featured') {
    try {
      await api.patchService(s.key, { [field]: !s[field] });
      setMsg(`已更新 ${s.name}`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>服务事项配置</h2>
      <p style={{ fontSize: 13, color: '#8a8a8a', marginBottom: 12 }}>
        「首页展示」控制默认两排中的 7 个高频场景；「启用」控制是否出现在更多列表。
      </p>
      {msg && <div style={{ marginBottom: 10, color: '#1f7a44' }}>{msg}</div>}
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>排序</th>
              <th>服务</th>
              <th>标签</th>
              <th>启用</th>
              <th>首页展示</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.key}>
                <td>{s.sort}</td>
                <td>
                  {s.icon} {s.name}
                </td>
                <td>{s.tag}</td>
                <td>
                  <button className="btn sm ghost" onClick={() => toggle(s, 'enabled')}>
                    {s.enabled ? '已启用' : '已停用'}
                  </button>
                </td>
                <td>
                  <button className="btn sm ghost" onClick={() => toggle(s, 'featured')}>
                    {s.featured ? '首页' : '更多'}
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
