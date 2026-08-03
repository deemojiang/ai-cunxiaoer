import { useEffect, useState } from 'react';
import { api, type Knowledge } from '../../api/client';

export default function KnowledgePage() {
  const [list, setList] = useState<Knowledge[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.adminKnowledge().then(setList);
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!title.trim() || !content.trim()) return;
    try {
      await api.addKnowledge({
        title,
        content,
        tags: tags.split(/[,，\s]+/).filter(Boolean),
        category: 'life',
      });
      setTitle('');
      setContent('');
      setTags('');
      setMsg('已添加');
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function del(id: string) {
    await api.delKnowledge(id);
    load();
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>知识库</h2>
      {msg && <div style={{ marginBottom: 10, color: '#1f7a44' }}>{msg}</div>}
      <div className="admin-card">
        <h3>新增条目</h3>
        <input
          placeholder="标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6' }}
        />
        <textarea
          placeholder="内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6', minHeight: 80 }}
        />
        <input
          placeholder="标签（逗号分隔）"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #e6e6e6' }}
        />
        <button className="btn" onClick={add}>
          添加
        </button>
      </div>
      <div className="admin-card">
        <h3>已有条目</h3>
        {list.map((k) => (
          <div key={k.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {k.title}{' '}
              <button className="btn sm ghost" onClick={() => del(k.id)}>
                删除
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>{k.content}</div>
            <div style={{ fontSize: 12, color: '#8a8a8a', marginTop: 4 }}>{k.tags.join(' · ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
