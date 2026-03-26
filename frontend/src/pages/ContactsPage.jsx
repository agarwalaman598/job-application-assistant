import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X, Loader2, Users, Mail, Phone, Link as LinkIcon, Building2, Search } from 'lucide-react';

import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ConfirmDialog } from '../components/ConfirmDialog';

const CONTACT_TYPES = ['hr', 'recruiter', 'interviewer', 'referral', 'other'];
const EMPTY_FORM = {
  full_name: '',
  contact_type: 'recruiter',
  company: '',
  email: '',
  phone: '',
  linkedin: '',
  notes: '',
  application_ids: [],
};

function formatType(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Other';
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.contact_type = typeFilter;
      if (search.trim()) params.q = search.trim();
      const res = await api.get('/contacts', { params });
      setContacts(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load applications.');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (contact) => {
    setForm({
      full_name: contact.full_name || '',
      contact_type: contact.contact_type || 'recruiter',
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin: contact.linkedin || '',
      notes: contact.notes || '',
      application_ids: contact.application_ids || [],
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const toggleApplication = (appId) => {
    setForm((prev) => {
      const hasApp = prev.application_ids.includes(appId);
      return {
        ...prev,
        application_ids: hasApp
          ? prev.application_ids.filter((id) => id !== appId)
          : [...prev.application_ids, appId],
      };
    });
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        application_ids: form.application_ids,
      };
      if (editingId) await api.put(`/contacts/${editingId}`, payload);
      else await api.post('/contacts', payload);

      closeForm();
      fetchContacts();
      toast.success(editingId ? 'Contact updated!' : 'Contact added!');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/contacts/${confirmId}`);
      setConfirmId(null);
      fetchContacts();
      toast.success('Contact deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete contact.');
    }
  };

  const displayedContacts = useMemo(() => {
    return contacts;
  }, [contacts]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <Helmet><title>Contacts | JobAssist AI</title></Helmet>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{displayedContacts.length} saved</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New contact
        </Button>
      </div>

      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--muted)', width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {['', ...CONTACT_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border-none"
            style={{
              background: typeFilter === t ? 'var(--card)' : 'transparent',
              color: typeFilter === t ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: typeFilter === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {t ? formatType(t) : 'All'}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', height: 14, width: 14, color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or email..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--foreground)', fontSize: '0.82rem', fontFamily: 'inherit',
            padding: '7px 12px 7px 32px', outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : displayedContacts.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">No contacts yet. Add your first one.</p>
          <Button variant="secondary" className="mt-4" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add contact
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedContacts.map((contact, i) => (
            <div key={contact.id} className="card px-5 py-4 flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
              <div style={{
                height: 32, width: 32, borderRadius: 8, flexShrink: 0,
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)',
              }}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{contact.full_name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    {formatType(contact.contact_type)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[var(--muted-foreground)]">
                  {contact.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {contact.company}</span>}
                  {contact.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {contact.email}</span>}
                  {contact.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {contact.phone}</span>}
                  <span>{(contact.application_ids || []).length} linked application(s)</span>
                </div>
              </div>

              {contact.linkedin && (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  title="Open LinkedIn"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </a>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(contact)}
                  title="Edit"
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmId(contact.id)}
                  title="Delete"
                  className="h-7 w-7 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[rgba(239,68,68,0.08)] transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="card p-6 w-full max-w-xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">{editingId ? 'Edit' : 'New'} contact</h2>
              <button
                onClick={closeForm}
                title="Close"
                className="h-7 w-7 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-auto pr-1">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Jane Doe" />
              </div>

              <div>
                <Label htmlFor="c-type">Type</Label>
                <select
                  id="c-type"
                  value={form.contact_type}
                  onChange={(e) => setForm((f) => ({ ...f, contact_type: e.target.value }))}
                  className="input-field"
                >
                  {CONTACT_TYPES.map((t) => (
                    <option key={t} value={t}>{formatType(t)}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="c-company">Company</Label>
                <select
                  id="c-company"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select company from applications</option>
                  {[...new Set(applications.map((app) => app.company))].map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
                </div>
                <div>
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 111" />
                </div>
              </div>

              <div>
                <Label htmlFor="c-linkedin">LinkedIn URL</Label>
                <Input id="c-linkedin" value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." />
              </div>

              <div>
                <Label htmlFor="c-notes">Notes</Label>
                <Textarea id="c-notes" value={form.notes} minRows={2} maxRows={10} placeholder="Optional notes..." onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <div>
                <Label>Linked Applications</Label>
                <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 max-h-44 overflow-auto">
                  {applications.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)] px-1 py-1">No applications found.</p>
                  ) : (
                    applications.map((app) => {
                      const checked = form.application_ids.includes(app.id);
                      return (
                        <label key={app.id} className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-[var(--muted)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleApplication(app.id)}
                          />
                          <span className="text-xs text-[var(--foreground)]">
                            {app.company} - {app.position}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <Button className="w-full mt-5" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editingId ? 'Update' : 'Add') + ' contact'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmId !== null}
        title="Delete contact"
        message="This will permanently remove the contact and its application links."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
