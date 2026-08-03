import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import ChatPage from './pages/user/ChatPage';
import MyPage from './pages/user/MyPage';
import AdminLayout from './pages/admin/AdminLayout';
import LoginPage from './pages/admin/LoginPage';
import Dashboard from './pages/admin/Dashboard';
import OrdersPage from './pages/admin/OrdersPage';
import VillagePage from './pages/admin/VillagePage';
import ServicesPage from './pages/admin/ServicesPage';
import KnowledgePage from './pages/admin/KnowledgePage';

function ChatWithQuery() {
  const [sp] = useSearchParams();
  const q = sp.get('q');
  useEffect(() => {
    if (q) {
      // stash for ChatPage to pick up once — dispatch custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai-send', { detail: q }));
      }, 300);
    }
  }, [q]);
  return <ChatPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatWithQuery />} />
      <Route path="/my" element={<MyPage />} />
      <Route path="/my/:id" element={<MyPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="village" element={<VillagePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
