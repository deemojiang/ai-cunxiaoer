import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const token = localStorage.getItem('admin_token');
  if (!token && loc.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" replace />;
  }

  if (loc.pathname === '/admin/login') return <Outlet />;

  const links = [
    { to: '/admin', label: '概览', end: true },
    { to: '/admin/orders', label: '工单中心' },
    { to: '/admin/village', label: '村务公开' },
    { to: '/admin/services', label: '服务配置' },
    { to: '/admin/knowledge', label: '知识库' },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-top">
        <div style={{ fontWeight: 600 }}>⚙️ AI 村小二 · 管理后台</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={{ color: '#fff', fontSize: 13 }}>← 村民端</a>
          <button
            className="btn sm ghost"
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', background: 'transparent' }}
            onClick={() => {
              localStorage.removeItem('admin_token');
              nav('/admin/login');
            }}
          >
            退出
          </button>
        </div>
      </div>
      <div className="admin-body">
        <nav className="admin-nav">
          {links.map((l) => {
            const active = l.end ? loc.pathname === l.to : loc.pathname.startsWith(l.to) && l.to !== '/admin';
            const isHome = l.to === '/admin' && loc.pathname === '/admin';
            return (
              <Link key={l.to} to={l.to} className={active || isHome ? 'active' : ''}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
