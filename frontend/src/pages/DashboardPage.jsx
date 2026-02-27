import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Edit2, Trash2, Filter, BriefcaseBusiness, X, Loader2 } from 'lucide-react';

const statusOptions = ['draft', 'applied', 'interview', 'offer', 'rejected'];

export default function DashboardPage() {
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ company: '', position: '', status: 'applied', url: '', notes: '' });
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications', { params: filter ? { status: filter } : {} });
      setApps(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApplications(); }, [filter]);

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/applications/${editingId}`, form);
      } else {
        await api.post('/applications', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ company: '', position: '', status: 'applied', url: '', notes: '' });
      fetchApplications();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (app) => {
    setForm({ company: app.company, position: app.position, status: app.status, url: app.url || '', notes: app.notes || '' });
    setEditingId(app.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return;
    await api.delete(`/applications/${id}`);
    fetchApplications();
  };

  const stats = {
    total: apps.length,
    draft: apps.filter(a => a.status === 'draft').length,
    applied: apps.filter(a => a.status === 'applied').length,
    interview: apps.filter(a => a.status === 'interview').length,
    offer: apps.filter(a => a.status === 'offer').length,
  };

  return (
    <div className="pt-20 px-6 pb-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Applications</h1>
          <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '2px' }}>{stats.total} tracked</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ company: '', position: '', status: 'applied', url: '', notes: '' }); }}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#ececed' },
          { label: 'Draft', value: stats.draft, color: '#8b8b92' },
          { label: 'Applied', value: stats.applied, color: '#d4942e' },
          { label: 'Interview', value: stats.interview, color: '#6398ec' },
          { label: 'Offers', value: stats.offer, color: '#3eb370' },
        ].map((s) => (
          <div key={s.label} className="card p-4 animate-enter">
            <p className="section-label">{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, marginTop: '4px', letterSpacing: '-0.02em' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} style={{ color: '#5a5a63' }} />
        {['', ...statusOptions].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className="text-xs px-3 py-1.5 rounded-md cursor-pointer border-none"
            style={{
              background: filter === s ? 'var(--color-surface-overlay)' : 'transparent',
              color: filter === s ? '#ececed' : '#5a5a63',
              fontFamily: 'var(--font-body)', fontWeight: filter === s ? 500 : 400,
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#5a5a63' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-12" style={{ textAlign: 'center' }}>
          <BriefcaseBusiness size={36} style={{ color: '#2a2a32', margin: '0 auto 12px' }} />
          <p style={{ color: '#5a5a63', fontSize: '0.85rem' }}>No applications yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((app, i) => (
            <div key={app.id} className="card p-4 flex items-center justify-between animate-enter"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{app.position}</p>
                <p style={{ color: '#8b8b92', fontSize: '0.8rem' }}>{app.company}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge badge-${app.status}`}>{app.status}</span>
                <button onClick={() => handleEdit(app)} className="bg-transparent border-none cursor-pointer"
                  style={{ color: '#5a5a63' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(app.id)} className="bg-transparent border-none cursor-pointer"
                  style={{ color: '#5a5a63' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card p-6 w-full max-w-md animate-enter">
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>{editingId ? 'Edit' : 'New'} Application</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="bg-transparent border-none cursor-pointer" style={{ color: '#5a5a63' }}><X size={18} /></button>
            </div>
            {[
              { label: 'Company', key: 'company', type: 'text' },
              { label: 'Position', key: 'position', type: 'text' },
              { label: 'URL', key: 'url', type: 'url' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#8b8b92', marginBottom: '4px' }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="input-field" placeholder={f.label} />
              </div>
            ))}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#8b8b92', marginBottom: '4px' }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#8b8b92', marginBottom: '4px' }}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field" rows={2} placeholder="Optional notes" />
            </div>
            <button onClick={handleSave} className="btn-primary" style={{ width: '100%' }}>
              {editingId ? 'Update' : 'Add'} Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
