const BASE = '/api';

function redirectAdminLogin() {
  localStorage.removeItem('admin_token');
  if (!window.location.pathname.startsWith('/admin/login')) {
    window.location.replace('/admin/login');
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = (err.error || '请求失败') as string;
    // Login failures stay on the form; session expiry redirects to re-login.
    const isLoginAttempt = url === '/admin/login';
    const isAuthFailure =
      !isLoginAttempt &&
      (res.status === 401 || /未登录|过期/.test(message));
    if (isAuthFailure) redirectAdminLogin();
    throw new Error(message);
  }
  return res.json();
}

export type User = { id: string; name: string; phone: string; group: string };
export type ServiceItem = {
  key: string;
  name: string;
  icon: string;
  tag: string;
  enabled: boolean;
  featured: boolean;
  sort: number;
  prefix: string;
};
export type TimelineItem = { t: string; txt: string; cur?: boolean };
export type Order = {
  id: string;
  no: string;
  cat: string;
  icon: string;
  title: string;
  type: string;
  status: 'wait' | 'doing' | 'ok';
  statusText: string;
  summary: string;
  time: string;
  detail: { rows: [string, string][]; timeline: TimelineItem[] };
};
export type Village = {
  name: string;
  region: string;
  intro: string;
  address: string;
  hotline: string;
  hours: string;
  cadres: { av: string; name: string; role: string; phone: string }[];
  grids: { name: string; lead: string; households: string }[];
  rulesHtml: string;
};
export type Knowledge = { id: string; title: string; content: string; tags: string[]; category: string };

export type WeatherResponse = {
  name: string;
  lat: number;
  lon: number;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    time?: string;
  };
  daily: {
    temperature_2m_max: number | null;
    temperature_2m_min: number | null;
  };
};

export const api = {
  me: () => req<User>('/me'),
  services: () => req<ServiceItem[]>('/services'),
  village: () => req<Village>('/village'),
  weather: (lat: number, lon: number, name?: string) => {
    const q = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      ...(name ? { name } : {}),
    });
    return req<WeatherResponse>(`/weather?${q}`);
  },
  knowledge: (q?: string) => req<Knowledge[]>(`/knowledge${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  orders: (cat = 'all') => req<Order[]>(`/orders?cat=${cat}`),
  order: (id: string) => req<Order>(`/orders/${id}`),
  createOrder: (body: Partial<Order> & { prefix?: string }) =>
    req<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (username: string, password: string) =>
    req<{ token: string; username: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminOrders: () => req<Order[]>('/admin/orders'),
  patchOrder: (id: string, body: { status?: string; statusText?: string; note?: string }) =>
    req<Order>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminServices: () => req<ServiceItem[]>('/admin/services'),
  patchService: (key: string, body: Partial<ServiceItem>) =>
    req<ServiceItem>(`/admin/services/${key}`, { method: 'PATCH', body: JSON.stringify(body) }),
  putVillage: (body: Partial<Village>) =>
    req<Village>('/admin/village', { method: 'PUT', body: JSON.stringify(body) }),
  adminKnowledge: () => req<Knowledge[]>('/admin/knowledge'),
  addKnowledge: (body: Omit<Knowledge, 'id'>) =>
    req<Knowledge>('/admin/knowledge', { method: 'POST', body: JSON.stringify(body) }),
  delKnowledge: (id: string) => req<{ ok: boolean }>(`/admin/knowledge/${id}`, { method: 'DELETE' }),
};
