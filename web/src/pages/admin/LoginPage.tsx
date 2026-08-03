import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const r = await api.adminLogin(username, password);
      localStorage.setItem('admin_token', r.token);
      nav('/admin');
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  return (
    <div className="admin-layout">
      <form className="login-box" onSubmit={submit}>
        <h2>管理后台登录</h2>
        <p>默认账号 admin / admin123</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
        />
        {err && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button className="btn" type="submit" style={{ width: '100%' }}>
          登录
        </button>
      </form>
    </div>
  );
}
