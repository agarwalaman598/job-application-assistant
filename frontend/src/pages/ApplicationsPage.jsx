import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import api from '../api';
import { Plus, Edit2, Trash2, X, Loader2, Briefcase, ExternalLink, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageLoadingState } from '../components/PageLoadingState';

const STATUS_OPTIONS = ['draft', 'applied', 'interview', 'offer', 'rejected'];
const STATUS_ORDER = { draft: 0, applied: 1, interview: 2, offer: 3, rejected: 4 };
const EMPTY_FORM = { company: '', position: '', status: 'applied', url: '', notes: '', resume_id: '' };

const SORT_OPTIONS = [
  { key: 'date-desc',    label: 'Date',    sub: 'Newest first',   field: 'date',    dir: 'desc' },
  { key: 'date-asc',    label: 'Date',    sub: 'Oldest first',   field: 'date',    dir: 'asc'  },
  { key: 'company-asc', label: 'Company', sub: 'A → Z',          field: 'company', dir: 'asc'  },
  { key: 'company-desc',label: 'Company', sub: 'Z → A',          field: 'company', dir: 'desc' },
  { key: 'status-asc',  label: 'Status',  sub: 'Draft → Offer',  field: 'status',  dir: 'asc'  },
  { key: 'status-desc', label: 'Status',  sub: 'Offer → Draft',  field: 'status',  dir: 'desc' },
];

export default function ApplicationsPage() {
  const [apps, setApps]           = useState([]);
  const [resumes, setResumes]     = useState([]);
  const [filter, setFilter]       = useState('');
  const [search, setSearch]       = useState('');
  const [sortKey, setSortKey]     = useState('date-desc');
  const [sortOpen, setSortOpen]   = useState(false);
  const sortRef                   = useRef(null);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications', { params: filter ? { status: filter } : {} });
      setApps(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchApps(); }, [filter]);
  useEffect(() => { fetchResumes(); }, []);

  const openNew  = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (app) => {
    setForm({
      company: app.company,
      position: app.position,
      status: app.status,
      url: app.url || '',
      notes: app.notes || '',
      resume_id: app.resume_id || '',
    });
    setEditingId(app.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const saveStartTime = Date.now();
    try {
      const payload = {
        ...form,
        resume_id: form.resume_id ? Number(form.resume_id) : null,
      };
      if (editingId) await api.put(`/applications/${editingId}`, payload);
      else           await api.post('/applications', payload);
      const elapsedTime = Date.now() - saveStartTime;
      const remainingTime = Math.max(0, 800 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      closeForm(); fetchApps();
      toast.success(editingId ? 'Application updated!' : 'Application added!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save application. Please try again.');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = async () => {
    setDeletingId(confirmId);
    const deleteStartTime = Date.now();
    try {
      await api.delete(`/applications/${confirmId}`);
      const elapsedTime = Date.now() - deleteStartTime;
      const remainingTime = Math.max(0, 800 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setConfirmId(null);
      fetchApps();
      toast.success('Application deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete application.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter + sort
  const activeSort = SORT_OPTIONS.find(o => o.key === sortKey);
  const displayedApps = [...apps]
    .filter(a => {
      const q = search.toLowerCase();
      return !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = activeSort.dir === 'asc' ? 1 : -1;
      if (activeSort.field === 'date') {
        return dir * (new Date(a.applied_at + 'Z') - new Date(b.applied_at + 'Z'));
      }
      if (activeSort.field === 'company') {
        return dir * a.company.localeCompare(b.company);
      }
      if (activeSort.field === 'status') {
        return dir * ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
      }
      return 0;
    });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <Helmet><title>Applications | JobAssist AI</title></Helmet>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{search ? `${displayedApps.length} of ${apps.length}` : apps.length} tracked</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New application
        </Button>
      </div>

      {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--muted)', width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
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

      {/* Search + Sort row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', height: 14, width: 14, color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by company or role…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              color: 'var(--foreground)', fontSize: '0.82rem', fontFamily: 'inherit',
              padding: '7px 12px 7px 32px', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#3a3a3a'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '7px 13px', fontSize: '0.82rem', fontWeight: 600,
              color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.2,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
          >
            <ArrowUpDown style={{ height: 13, width: 13 }} />
            Sort: {activeSort.label} {activeSort.dir === 'asc' ? '↑' : '↓'}
          </button>

          {sortOpen && (
            <div
              className="animate-modal"
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                background: '#141414', border: '1px solid #2a2a2a', borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: 160, maxWidth: 'min(92vw, 260px)',
              }}
            >
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 14px', background: sortKey === opt.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    borderBottom: '1px solid #1f1f1f',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = sortKey === opt.key ? 'rgba(255,255,255,0.05)' : 'transparent'}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground)' }}>{opt.label}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)', marginLeft: 8 }}>{opt.sub}</span>
                  </div>
                  {opt.dir === 'asc'
                    ? <ChevronUp style={{ height: 13, width: 13, color: 'var(--muted-foreground)' }} />
                    : <ChevronDown style={{ height: 13, width: 13, color: 'var(--muted-foreground)' }} />
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <PageLoadingState label="Loading applications..." rows={4} />
      ) : displayedApps.length === 0 ? (
        <div className="card p-16 text-center">
          <Briefcase className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">{search ? 'No results found.' : 'No applications yet. Add your first one!'}</p>
          {!search && <Button variant="secondary" className="mt-4" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add application
          </Button>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedApps.map((app, i) => (
            <div key={app.id} className="card px-5 py-4 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 animate-fade-in"
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{app.company}</p>
                  <StatusBadge status={app.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  <p className="text-xs text-[var(--muted-foreground)]">{app.position}</p>
                  {app.resume_filename && (
                    <>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.55rem' }}>●</span>
                      <p
                        className="text-xs text-[var(--muted-foreground)]"
                        title={app.resume_filename}
                        style={{
                          minWidth: 0,
                          maxWidth: '100%',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        Resume: {app.resume_filename}
                      </p>
                    </>
                  )}
                  {app.applied_at && (
                    <>
                      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.55rem' }}>●</span>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(app.applied_at + 'Z').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" title="Open link"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {app.resume_drive_link && (
                <a href={app.resume_drive_link} target="_blank" rel="noreferrer" title="Open resume link"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Briefcase className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-0">
                <button onClick={() => openEdit(app)} title="Edit"
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(app.id)} title="Delete"
                  disabled={deletingId === app.id}
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[rgba(239,68,68,0.08)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {deletingId === app.id ? (
                    <div className="h-3.5 w-3.5 border-2 border-[rgba(239,68,68,0.3)] border-t-[var(--destructive)] rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
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
              <button onClick={closeForm} title="Close"
                className="h-7 w-7 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="m-resume">Resume Used</Label>
                <select id="m-resume" value={form.resume_id}
                  onChange={e => setForm(f => ({ ...f, resume_id: e.target.value }))}
                  className="input-field">
                  <option value="">Not selected</option>
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>{r.filename}{r.is_default ? ' (Default)' : ''}</option>
                  ))}
                </select>
              </div>
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
                <Textarea id="m-url" placeholder="https://..." value={form.url}
                  minRows={1} maxRows={4} expandOnFocusRows={2} singleLine
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
                <Textarea id="m-notes" value={form.notes} minRows={2} maxRows={10} placeholder="Optional notes..."
                  className="input-field"
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <Button className="w-full mt-5" onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-opacity-20 border-t-current rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                (editingId ? 'Update' : 'Add') + ' application'
              )}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete application"
        message="This will permanently remove the application from your tracker."
        confirmLabel="Delete"
        danger
        isLoading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
