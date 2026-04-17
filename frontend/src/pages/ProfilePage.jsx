import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import api from '../api';
import {
  Save,
  Plus,
  X,
  Loader2,
  Briefcase,
  GraduationCap,
  Globe,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone as PhoneIcon,
} from 'lucide-react';
import { ConfirmDialog, UnsavedChangesDialog } from '../components/ConfirmDialog';
import { PageLoadingState } from '../components/PageLoadingState';

const UserIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="8 6 2 12 8 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const CONTACT_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
];

export default function ProfilePage() {
  const KNOWN_GPA_SCALES = new Set(['4', '10', '100']);

  const [profile, setProfile] = useState({
    summary: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    contact_fields: [],
    skills: [],
    experience: [],
    education: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState('');

  const [savedAnswers, setSavedAnswers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmAnswerId, setConfirmAnswerId] = useState(null);
  const [confirmEducationIndex, setConfirmEducationIndex] = useState(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [deletingAllAnswers, setDeletingAllAnswers] = useState(false);
  const [dragItem, setDragItem] = useState({ section: null, index: null });
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const answersToShow = 6;

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState(null);
  const [isCustomScaleSelected, setIsCustomScaleSelected] = useState(false);
  const [educationDraft, setEducationDraft] = useState({
    degree: '',
    major: '',
    institution: '',
    start_year: '',
    end_year: '',
    gpa: '',
    gpa_scale: '',
  });

  const cleanProfileRef = useRef(null);
  const autosavingOrderRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (cleanProfileRef.current === null) return;
    setIsDirty(JSON.stringify(profile) !== cleanProfileRef.current);
  }, [profile]);

  const { registerGuard, clearGuard, isBlocked, proceed, cancel } = useNavigationGuard();
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    registerGuard(() => isDirtyRef.current);
    return () => clearGuard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sentinelPushedRef = useRef(false);
  const [backBlocked, setBackBlocked] = useState(false);

  const normalizeSkill = (value) => String(value || '').trim().toLowerCase();

  const moveInArray = (items, fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (section, index) => (e) => {
    setDragItem({ section, index });
    e.dataTransfer.effectAllowed = 'move';
    // Required in Firefox for drag start to work.
    e.dataTransfer.setData('text/plain', `${section}:${index}`);

    // Show the full row/card as drag preview instead of just the handle icon.
    const dragContainer = e.currentTarget.closest('[data-drag-container="true"]');
    if (dragContainer) {
      e.dataTransfer.setDragImage(dragContainer, 24, 24);
    }
  };

  const handleDragEnd = () => {
    setDragItem({ section: null, index: null });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragOverReorder = (section, toIndex) => (e) => {
    e.preventDefault();
    setProfile((p) => {
      if (dragItem.section !== section || dragItem.index === null) return p;
      if (dragItem.index === toIndex) return p;

      if (section === 'experience') {
        return { ...p, experience: moveInArray(p.experience, dragItem.index, toIndex) };
      }
      if (section === 'education') {
        return { ...p, education: moveInArray(p.education, dragItem.index, toIndex) };
      }
      if (section === 'contact_fields') {
        return { ...p, contact_fields: moveInArray(p.contact_fields, dragItem.index, toIndex) };
      }
      return p;
    });

    // Keep dragged index in sync after live reorder for smooth movement.
    setDragItem((current) => ({ ...current, index: toIndex }));
  };

  const handleDropReorder = (section, toIndex) => (e) => {
    e.preventDefault();
    // Most reordering already happens live in onDragOver; onDrop only finalizes state.
    setDragItem({ section: null, index: null });
    void saveOrderSilently(profile);
  };

  // Helper function to parse skills - handles both comma-separated strings and arrays
  const parseSkills = (skillsData) => {
    if (!skillsData) return [];
    const dedupe = (items) => {
      const seen = new Set();
      const out = [];
      for (const item of items) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        const key = normalizeSkill(trimmed);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
      }
      return out;
    };

    if (typeof skillsData === 'string') {
      // Split comma-separated string and trim each skill
      return dedupe(skillsData.split(','));
    }
    if (Array.isArray(skillsData)) {
      // If already array but contains comma-separated strings, parse them
      const parsed = [];
      for (const skill of skillsData) {
        if (typeof skill === 'string' && skill.includes(',')) {
          parsed.push(...skill.split(','));
        } else {
          parsed.push(skill);
        }
      }
      return dedupe(parsed);
    }
    return [];
  };

  const getContactPlaceholder = (type) => {
    if (type === 'phone') return '+91 98765 43210';
    if (type === 'email') return 'email@example.com';
    if (type === 'url') return 'https://example.com';
    return 'Enter value';
  };

  const normalizeContactFields = (fields, fallback = {}) => {
    const toType = (value) => (['text', 'email', 'phone', 'url'].includes(value) ? value : 'text');

    if (Array.isArray(fields) && fields.length > 0) {
      return fields.map((field, index) => ({
        id: Number.isInteger(field?.id) ? field.id : index + 1,
        label: (field?.label || 'Custom Field').trim(),
        value: field?.value || '',
        type: toType(field?.type),
      }));
    }

    const seeded = [
      { id: 1, label: 'Phone', value: fallback.phone || '', type: 'phone' },
      { id: 2, label: 'LinkedIn', value: fallback.linkedin || '', type: 'url' },
      { id: 3, label: 'GitHub', value: fallback.github || '', type: 'url' },
      { id: 4, label: 'Website', value: fallback.website || '', type: 'url' },
      { id: 5, label: 'Email', value: fallback.email || '', type: 'email' },
    ];
    return seeded.filter((field) => field.value);
  };

  const getActionButton = (field) => {
    const value = String(field?.value || '').trim();
    if (!value) return null;

    if (field.type === 'email') {
      return (
        <a
          href={`mailto:${value}`}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Send email"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="w-3.5 h-3.5" />
        </a>
      );
    }
    if (field.type === 'phone') {
      return (
        <a
          href={`tel:${value}`}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Call phone"
          onClick={(e) => e.stopPropagation()}
        >
          <PhoneIcon className="w-3.5 h-3.5" />
        </a>
      );
    }
    if (field.type === 'url') {
      const href = value.startsWith('http') ? value : `https://${value}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
          title="Open link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      );
    }
    return null;
  };

  useEffect(() => {
    if (isDirty && !sentinelPushedRef.current) {
      history.pushState({ profileGuard: true }, '', window.location.pathname);
      sentinelPushedRef.current = true;
    }
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (isDirtyRef.current) {
        history.pushState({ profileGuard: true }, '', window.location.pathname);
        setBackBlocked(true);
      } else {
        sentinelPushedRef.current = false;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    api.get('/profile')
      .then((res) => {
        const contactFields = normalizeContactFields(res.data.contact_fields, res.data);
        const p = {
          summary: res.data.summary || '',
          phone: res.data.phone || '',
          linkedin: res.data.linkedin || '',
          github: res.data.github || '',
          website: res.data.website || '',
          contact_fields: contactFields,
          skills: parseSkills(res.data.skills),
          experience: res.data.experience || [],
          education: res.data.education || [],
        };
        setProfile(p);
        cleanProfileRef.current = JSON.stringify(p);
        setIsDirty(false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get('/profile/saved-answers')
      .then((res) => setSavedAnswers(res.data))
      .catch(console.error);
  }, []);

  const buildPersistableProfile = useCallback((sourceProfile) => {
    const contactFields = Array.isArray(sourceProfile.contact_fields) ? sourceProfile.contact_fields : [];
    const findValue = (predicate) => {
      const match = contactFields.find(predicate);
      return (match?.value || '').trim();
    };

    return {
      ...sourceProfile,
      phone: findValue((f) => f.type === 'phone' && f.value),
      linkedin: findValue((f) => f.label?.trim().toLowerCase() === 'linkedin' && f.value),
      github: findValue((f) => f.label?.trim().toLowerCase() === 'github' && f.value),
      website: findValue((f) => f.label?.trim().toLowerCase() === 'website' && f.value),
    };
  }, []);

  const saveOrderSilently = useCallback(async (sourceProfile) => {
    if (autosavingOrderRef.current) return;
    const payloadProfile = buildPersistableProfile(sourceProfile);
    const payloadString = JSON.stringify(payloadProfile);
    if (cleanProfileRef.current === payloadString) return;

    autosavingOrderRef.current = true;
    try {
      await api.put('/profile', payloadProfile);
      setProfile(payloadProfile);
      cleanProfileRef.current = payloadString;
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to auto-save order. Please click Save Changes.');
    } finally {
      autosavingOrderRef.current = false;
    }
  }, [buildPersistableProfile]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payloadProfile = buildPersistableProfile(profile);

      await api.put('/profile', payloadProfile);
      setProfile(payloadProfile);
      cleanProfileRef.current = JSON.stringify(payloadProfile);
      setIsDirty(false);
      toast.success('Profile saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save profile. Please try again.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [saving, profile, buildPersistableProfile]);

  const handleSaveAndLeave = useCallback(async () => {
    try {
      await handleSave();
      clearGuard();
      proceed();
    } catch {
      // stay on page
    }
  }, [handleSave, clearGuard, proceed]);

  const handleDiscardAndLeave = useCallback(() => {
    setProfile(JSON.parse(cleanProfileRef.current));
    setIsDirty(false);
    clearGuard();
    proceed();
  }, [clearGuard, proceed]);

  const handleBackSaveAndLeave = useCallback(async () => {
    try {
      await handleSave();
      setBackBlocked(false);
      sentinelPushedRef.current = false;
      clearGuard();
      history.go(-2);
    } catch {
      // stay on page
    }
  }, [handleSave, clearGuard]);

  const handleBackDiscard = useCallback(() => {
    setProfile(JSON.parse(cleanProfileRef.current));
    setIsDirty(false);
    setBackBlocked(false);
    sentinelPushedRef.current = false;
    clearGuard();
    history.go(-2);
  }, [clearGuard]);

  const dialogOpen = isBlocked || backBlocked;
  const dialogHandlers = backBlocked
    ? { onSave: handleBackSaveAndLeave, onDiscard: handleBackDiscard, onStay: () => setBackBlocked(false) }
    : { onSave: handleSaveAndLeave, onDiscard: handleDiscardAndLeave, onStay: cancel };

  const addSkill = () => {
    const value = skillInput.trim();
    const normalized = normalizeSkill(value);
    if (!value) return;
    if (profile.skills.some((s) => normalizeSkill(s) === normalized)) {
      toast.error('This skill is already added.');
      return;
    }
    setProfile((p) => ({ ...p, skills: [...p.skills, value] }));
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  const addExperience = () => {
    setProfile((p) => ({
      ...p,
      experience: [...p.experience, { title: '', company: '', duration: '', description: '' }],
    }));
  };

  const updateExperience = (index, field, value) => {
    const exp = [...profile.experience];
    exp[index] = { ...exp[index], [field]: value };
    setProfile((p) => ({ ...p, experience: exp }));
  };

  const removeExperience = (index) => {
    setProfile((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== index) }));
  };

  const addEducation = () => {
    setProfile((p) => ({
      ...p,
      education: [...p.education, { degree: '', major: '', institution: '', start_year: '', end_year: '', gpa: '' }],
    }));
  };

  const updateEducation = (index, field, value) => {
    const edu = [...profile.education];
    edu[index] = { ...edu[index], [field]: value };
    setProfile((p) => ({ ...p, education: edu }));
  };

  const requestRemoveEducation = (index) => {
    setConfirmEducationIndex(index);
  };

  const removeEducation = () => {
    if (confirmEducationIndex === null) return;
    setProfile((p) => ({
      ...p,
      education: p.education.filter((_, i) => i !== confirmEducationIndex),
    }));
    setConfirmEducationIndex(null);
  };

  const addContactField = () => {
    setProfile((p) => {
      const maxId = p.contact_fields.reduce((max, field) => Math.max(max, Number(field.id) || 0), 0);
      return {
        ...p,
        contact_fields: [
          ...p.contact_fields,
          { id: maxId + 1, label: 'Custom Field', value: '', type: 'text' },
        ],
      };
    });
  };

  const updateContactField = (id, updates) => {
    setProfile((p) => ({
      ...p,
      contact_fields: p.contact_fields.map((field) => (field.id === id ? { ...field, ...updates } : field)),
    }));
  };

  const removeContactField = (id) => {
    if (!window.confirm('Delete this contact field?')) return;
    setProfile((p) => ({
      ...p,
      contact_fields: p.contact_fields.filter((field) => field.id !== id),
    }));
  };

  const openEducationModal = (index = null) => {
    if (index !== null) {
      const current = profile.education[index] || {};
      setEditingEducationIndex(index);
      const currentScale = current.gpa_scale || '';
      setIsCustomScaleSelected(Boolean(currentScale) && !KNOWN_GPA_SCALES.has(currentScale));
      setEducationDraft({
        degree: current.degree || '',
        major: current.major || '',
        institution: current.institution || '',
        start_year: current.start_year || '',
        end_year: current.end_year || '',
        gpa: current.gpa || '',
        gpa_scale: current.gpa_scale || '',
      });
    } else {
      setEditingEducationIndex(null);
      setIsCustomScaleSelected(false);
      setEducationDraft({
        degree: '',
        major: '',
        institution: '',
        start_year: '',
        end_year: '',
        gpa: '',
        gpa_scale: '',
      });
    }
    setEducationModalOpen(true);
  };

  const saveEducation = () => {
    if (editingEducationIndex !== null) {
      setProfile((p) => {
        const next = [...p.education];
        next[editingEducationIndex] = { ...educationDraft };
        return { ...p, education: next };
      });
    } else {
      setProfile((p) => ({ ...p, education: [...p.education, { ...educationDraft }] }));
    }
    setEducationModalOpen(false);
  };

  const formatGPA = (gpa, scale) => {
    if (!gpa) return '';
    const scaleMap = {
      '4': '/4.0',
      '10': '/10',
      '100': '%',
    };
    if (!scale) return gpa;
    if (scaleMap[scale]) return `${gpa}${scaleMap[scale]}`;
    const custom = String(scale).trim();
    if (!custom) return gpa;
    if (custom.startsWith('/') || custom.startsWith('%')) return `${gpa}${custom}`;
    if (custom.toLowerCase().startsWith('out of')) return `${gpa} ${custom}`;
    return `${gpa}/${custom}`;
  };

  const startEditSummary = () => {
    setSummaryDraft(profile.summary);
    setEditingSummary(true);
  };

  const saveSummary = () => {
    setProfile((p) => ({ ...p, summary: summaryDraft }));
    setEditingSummary(false);
  };

  const summaryPreview = summaryExpanded
    ? profile.summary
    : `${profile.summary.slice(0, 220)}${profile.summary.length > 220 ? '...' : ''}`;

  const startEditAnswer = (item) => {
    setEditingId(item.id);
    setEditValue(item.answer);
  };

  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/profile/saved-answers/${id}`, { answer: editValue });
      setSavedAnswers((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update saved answer');
    }
  };

  const deleteAnswer = async () => {
    try {
      await api.delete(`/profile/saved-answers/${confirmAnswerId}`);
      setSavedAnswers((prev) => prev.filter((a) => a.id !== confirmAnswerId));
      setConfirmAnswerId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete saved answer');
    }
  };

  const deleteAllAnswers = async () => {
    if (deletingAllAnswers) return;
    setDeletingAllAnswers(true);
    try {
      await api.delete('/profile/saved-answers');
      setSavedAnswers([]);
      setShowAllAnswers(false);
      setConfirmDeleteAllOpen(false);
      toast.success('All saved answers deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete saved answers');
    } finally {
      setDeletingAllAnswers(false);
    }
  };

  const visibleAnswers = showAllAnswers ? savedAnswers : savedAnswers.slice(0, answersToShow);

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <Helmet><title>Profile | JobAssist AI</title></Helmet>
        <PageLoadingState label="Loading profile..." rows={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <Helmet><title>Profile | JobAssist AI</title></Helmet>

      <UnsavedChangesDialog
        open={dialogOpen}
        onSave={dialogHandlers.onSave}
        onDiscard={dialogHandlers.onDiscard}
        onStay={dialogHandlers.onStay}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/[0.01] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/[0.01] blur-[100px] rounded-full" />
      </div>

      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Professional Profile</h1>
              <p className="text-sm text-white/40 mt-0.5">Build your career story</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="self-start sm:self-auto px-5 py-2 bg-white hover:bg-white/90 text-black rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-4 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <UserIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">ABOUT</h2>
                    <p className="text-xs text-white/40 mt-0.5">Professional Summary</p>
                  </div>
                </div>
                {!editingSummary && (
                  <button
                    onClick={startEditSummary}
                    className="self-start p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {editingSummary ? (
                <div className="space-y-4">
                  <textarea
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-sm text-white/90 focus:border-white/20 focus:outline-none resize-none transition-all placeholder:text-white/30"
                    rows={6}
                    placeholder="Write your professional summary..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={saveSummary}
                      className="px-5 py-2.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSummary(false)}
                      className="px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[15px] text-white/70 leading-relaxed whitespace-pre-wrap">
                    {summaryPreview || 'Write a short summary about your background and goals.'}
                  </p>
                  {profile.summary.length > 220 && (
                    <button
                      onClick={() => setSummaryExpanded((v) => !v)}
                      className="flex items-center gap-1.5 px-4 py-2 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 hover:text-white font-medium transition-all"
                    >
                      {summaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {summaryExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">EXPERIENCE</h2>
                    <p className="text-xs text-white/40 mt-0.5">Your career journey</p>
                  </div>
                </div>
                <button
                  onClick={addExperience}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>

              <div className="space-y-8">
                {profile.experience.map((exp, i) => (
                  <div
                    key={i}
                    className={`relative group/item ${dragItem.section === 'experience' && dragItem.index === i ? 'opacity-60 ring-1 ring-white/20 rounded-xl' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('experience', i)}
                    onDrop={handleDropReorder('experience', i)}
                  >
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                        </div>
                        {i < profile.experience.length - 1 && (
                          <div className="w-px h-full bg-gradient-to-b from-white/20 to-transparent mt-2" />
                        )}
                      </div>

                      <div className="flex-1 pb-2">
                        <div className="bg-black/20 border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                            <div className="flex-1 space-y-2">
                              <input
                                value={exp.title}
                                onChange={(e) => updateExperience(i, 'title', e.target.value)}
                                className="w-full bg-transparent border-none text-base font-bold text-white placeholder:text-white/30 focus:outline-none"
                                placeholder="Job Title"
                              />
                              <input
                                value={exp.company}
                                onChange={(e) => updateExperience(i, 'company', e.target.value)}
                                className="w-full bg-transparent border-none text-sm text-white/60 placeholder:text-white/30 focus:outline-none"
                                placeholder="Company Name"
                              />
                              <input
                                value={exp.duration}
                                onChange={(e) => updateExperience(i, 'duration', e.target.value)}
                                className="w-full bg-transparent border-none text-xs text-white/40 placeholder:text-white/30 focus:outline-none"
                                placeholder="Jan 2022 - Present"
                              />
                            </div>
                            <div className="flex flex-row sm:flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity self-start">
                              <button
                                draggable
                                onDragStart={handleDragStart('experience', i)}
                                onDragEnd={handleDragEnd}
                                className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-grab active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeExperience(i)}
                                className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={exp.description}
                            onChange={(e) => updateExperience(i, 'description', e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-sm text-white/70 focus:border-white/20 focus:outline-none resize-none transition-all placeholder:text-white/30"
                            rows={3}
                            placeholder="Describe your key responsibilities and achievements..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {profile.experience.length === 0 && (
                  <p className="text-sm text-white/40">No experience entries yet. Click Add Role to get started.</p>
                )}
              </div>
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-7 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">EDUCATION</h2>
                    <p className="text-xs text-white/40 mt-0.5">Academic background</p>
                  </div>
                </div>
                <button
                  onClick={() => openEducationModal(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="space-y-4">
                {profile.education.map((edu, i) => (
                  <div
                    key={i}
                    className={`group/edu bg-black/20 border border-white/5 rounded-xl p-4 sm:p-5 hover:border-white/10 transition-all ${dragItem.section === 'education' && dragItem.index === i ? 'opacity-60 ring-1 ring-white/20' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('education', i)}
                    onDrop={handleDropReorder('education', i)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white">{edu.institution || 'Institution'}</h3>
                        <p className="text-sm text-white/60 mt-1">
                          {edu.degree || 'Degree'}{edu.major ? ` · ${edu.major}` : ''}
                        </p>
                        <p className="text-xs text-white/40 mt-1.5">
                          {edu.start_year || 'Start'} - {edu.end_year || 'End'}{edu.gpa ? ` · ${formatGPA(edu.gpa, edu.gpa_scale)}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/edu:opacity-100 transition-opacity self-start">
                        <button
                          draggable
                          onDragStart={handleDragStart('education', i)}
                          onDragEnd={handleDragEnd}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEducationModal(i)}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestRemoveEducation(i)}
                          className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {profile.education.length === 0 && (
                  <p className="text-sm text-white/40">No education entries yet. Click Add to get started.</p>
                )}
              </div>
            </section>

            <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <DatabaseIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">SAVED ANSWERS</h2>
                    <p className="text-xs text-white/40 mt-1">Learned from form submissions</p>
                    <p className="text-xs text-white/30 mt-0.5">Auto-filled on future forms</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {savedAnswers.length > 0 && (
                    <button
                      onClick={() => setConfirmDeleteAllOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-300/90 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 hover:border-red-400/40 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete All
                    </button>
                  )}
                  <div className="text-xs text-white/30">{savedAnswers.length} answers</div>
                </div>
              </div>

              {savedAnswers.length === 0 ? (
                <p className="mt-6 text-sm text-white/40">No saved answers yet. Fill out forms on Autofill and they will appear here.</p>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleAnswers.map((item) => (
                      <div key={item.id} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                        {editingId === item.id ? (
                          <div className="space-y-3">
                            <label className="block text-xs font-medium text-white/50 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.question}</label>
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(item.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(item.id)}
                                className="px-4 py-1.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between mb-3 gap-2">
                              <p className="text-xs font-medium text-white/50 break-words flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.question}</p>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditAnswer(item)}
                                  className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition-all"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmAnswerId(item.id)}
                                  className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-white/90 font-medium break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {savedAnswers.length > answersToShow && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setShowAllAnswers((v) => !v)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        {showAllAnswers ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show {savedAnswers.length - answersToShow} More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <section className="lg:sticky lg:top-24 relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CONTACT</h2>
                  <p className="text-xs text-white/40 mt-0.5">Get in touch</p>
                </div>
              </div>

              <div className="space-y-3">
                {profile.contact_fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`group/field ${dragItem.section === 'contact_fields' && dragItem.index === index ? 'opacity-60 ring-1 ring-white/20 rounded-lg' : ''}`}
                    data-drag-container="true"
                    onDragOver={handleDragOverReorder('contact_fields', index)}
                    onDrop={handleDropReorder('contact_fields', index)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 sm:gap-2">
                      <input
                        value={field.label}
                        onChange={(e) => updateContactField(field.id, { label: e.target.value })}
                        className="bg-transparent border-none text-xs font-medium text-white/40 focus:text-white/70 focus:outline-none px-0 py-0 flex-1"
                        placeholder="Label"
                      />
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/field:opacity-100 transition-opacity self-start">
                        <button
                          draggable
                          onDragStart={handleDragStart('contact_fields', index)}
                          onDragEnd={handleDragEnd}
                          className="p-1 text-white/30 hover:text-white hover:bg-white/10 rounded transition-all opacity-0 group-hover/field:opacity-100 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                        <select
                          value={field.type}
                          onChange={(e) => updateContactField(field.id, { type: e.target.value })}
                          className="appearance-none bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-medium focus:border-white/20 focus:bg-white/10 focus:outline-none opacity-0 group-hover/field:opacity-100 transition-all cursor-pointer hover:bg-white/10"
                        >
                          {CONTACT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeContactField(field.id)}
                          className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover/field:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        value={field.value}
                        onChange={(e) => updateContactField(field.id, { value: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                        placeholder={getContactPlaceholder(field.type)}
                      />
                      {field.value && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          {getActionButton(field)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addContactField}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/15 text-white rounded-lg text-sm font-medium transition-all mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>
            </section>

            <div className="group relative">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <section className="relative bg-[#111111] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                    <CodeIcon />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">SKILLS</h2>
                    <p className="text-xs text-white/40 mt-0.5">{profile.skills.length} skills</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:ring-2 focus:ring-white/10 focus:outline-none transition-all"
                    placeholder="Add a skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={`${skill}-${i}`}
                      className="group/skill inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-b from-white/[0.06] to-white/[0.03] hover:from-white/[0.1] hover:to-white/[0.06] border border-white/10 hover:border-white/20 text-white/85 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="opacity-100 sm:opacity-0 sm:group-hover/skill:opacity-100 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

      </div>

      {educationModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in">
            <div className="sticky top-0 bg-[#111111] border-b border-white/10 px-7 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/70">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {editingEducationIndex !== null ? 'Edit Education' : 'Add Education'}
                </h3>
              </div>
              <button
                onClick={() => setEducationModalOpen(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Degree</label>
                  <input
                    value={educationDraft.degree}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, degree: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. B.Tech, MBA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Major</label>
                  <input
                    value={educationDraft.major || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, major: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Institution</label>
                <input
                  value={educationDraft.institution}
                  onChange={(e) => setEducationDraft((d) => ({ ...d, institution: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                  placeholder="e.g. Kalinga Institute of Industrial Technology"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Start</label>
                  <input
                    value={educationDraft.start_year || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, start_year: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">End</label>
                  <input
                    value={educationDraft.end_year || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, end_year: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="2027"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">GPA / %</label>
                  <input
                    value={educationDraft.gpa || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, gpa: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="8.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">GPA Scale (Optional)</label>
                <select
                  value={isCustomScaleSelected ? 'custom' : (educationDraft.gpa_scale || '')}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'custom') {
                      setIsCustomScaleSelected(true);
                      setEducationDraft((d) => ({
                        ...d,
                        gpa_scale: KNOWN_GPA_SCALES.has(d.gpa_scale || '') ? '' : (d.gpa_scale || ''),
                      }));
                    } else {
                      setIsCustomScaleSelected(false);
                      setEducationDraft((d) => ({ ...d, gpa_scale: selected }));
                    }
                  }}
                  className="appearance-none w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a1a] text-white/60">Select scale</option>
                  <option value="4" className="bg-[#1a1a1a] text-white">Out of 4.0</option>
                  <option value="10" className="bg-[#1a1a1a] text-white">Out of 10.0</option>
                  <option value="100" className="bg-[#1a1a1a] text-white">Percentage (100%)</option>
                  <option value="custom" className="bg-[#1a1a1a] text-white">Custom</option>
                </select>
                {isCustomScaleSelected && (
                  <input
                    value={educationDraft.gpa_scale || ''}
                    onChange={(e) => setEducationDraft((d) => ({ ...d, gpa_scale: e.target.value }))}
                    className="mt-3 w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all placeholder:text-white/30"
                    placeholder="e.g. 5, 7, Out of 5"
                  />
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#111111] border-t border-white/10 px-5 sm:px-7 py-4 sm:py-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={() => setEducationModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveEducation}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-white/90 text-black rounded-lg text-sm font-semibold transition-all"
              >
                {editingEducationIndex !== null ? 'Save Changes' : 'Add Education'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAnswerId !== null}
        title="Delete saved answer"
        message="This answer will be permanently removed and won't be available for future autofills."
        confirmLabel="Delete"
        danger
        onConfirm={deleteAnswer}
        onCancel={() => setConfirmAnswerId(null)}
      />

      <ConfirmDialog
        open={confirmEducationIndex !== null}
        title="Delete education entry"
        message="This education entry will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={removeEducation}
        onCancel={() => setConfirmEducationIndex(null)}
      />

      <ConfirmDialog
        open={confirmDeleteAllOpen}
        title="Delete all saved answers"
        message="This will permanently remove all saved answers used for autofill suggestions."
        confirmLabel={deletingAllAnswers ? 'Deleting...' : 'Delete All'}
        danger
        onConfirm={deleteAllAnswers}
        onCancel={() => !deletingAllAnswers && setConfirmDeleteAllOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}

