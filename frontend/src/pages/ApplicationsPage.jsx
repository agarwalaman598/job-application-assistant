import { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Edit2, Trash2, X, Loader2, Briefcase, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { StatusBadge } from '../components/StatusBadge';

const STATUS_OPTIONS = ['draft', 'applied', 'interview', 'offer', 'rejected'];
const EMPTY_FORM = { company: '', position: '', status: 'applied', url: '', notes: '' };

export default function ApplicationsPage() {
  const [apps, setApps]           = useState([]);
  const [filter, setFilter]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications', { params: filter ? { status: filter } : {} });
      setApps(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(); }, [filter]);

  const openNew  = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (app) => {
    setForm({ company: app.company, position: app.position, status: app.status, url: app.url || '', notes: app.notes || '' });
    setEditingId(app.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) await api.put(`/applications/${editingId}`, form);
      else           await api.post('/applications', form);
      closeForm(); fetchApps();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return;
    await api.delete(`/applications/${id}`);
    fetchApps();
  };

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{apps.length} tracked</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New application
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-lg" style={{ background: 'var(--muted)', width: 'fit-content' }}>
        {['', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border-none"
            style={{
              background: filter === s ? 'var(--card)' : 'transparent',
              color: filter === s ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: filter === s ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-16 text-center">
          <Briefcase className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">No applications yet. Add your first one!</p>
          <Button variant="secondary" className="mt-4" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add application
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((app, i) => (
            <div key={app.id} className="card px-5 py-4 flex items-center gap-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.04}s` }}>
              {/* Serial number */}
              <div style={{
                height: 32, width: 32, borderRadius: 8, flexShrink: 0,
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)',
                fontFamily: 'inherit', letterSpacing: '-0.01em',
              }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{app.company}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  <p className="text-xs text-[var(--muted-foreground)]">{app.position}</p>
                  {app.applied_at && (
                    <>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.55rem' }}>●</span>
                      <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(app.applied_at + 'Z').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <StatusBadge status={app.status} />
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(app)}
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(app.id)}
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[rgba(239,68,68,0.08)] transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="card p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">{editingId ? 'Edit' : 'New'} application</h2>
              <button onClick={closeForm}
                className="h-7 w-7 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="m-company">Company</Label>
                <Input id="m-company" placeholder="Acme Corp" value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="m-position">Position</Label>
                <Input id="m-position" placeholder="Software Engineer" value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="m-url">Job URL</Label>
                <Input id="m-url" type="url" placeholder="https://..." value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="m-status">Status</Label>
                <select id="m-status" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="input-field">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="m-notes">Notes</Label>
                <textarea id="m-notes" value={form.notes} rows={2} placeholder="Optional notes…"
                  className="input-field resize-none"
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <Button className="w-full mt-5" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (editingId ? 'Update' : 'Add') + ' application'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
