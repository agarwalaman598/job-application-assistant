import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import api from '../api';
import { Save, Plus, X, Loader2, Briefcase, GraduationCap, Globe, BookOpen, Pencil, Trash2, Check, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    summary: '', phone: '', linkedin: '', github: '', website: '',
    skills: [], experience: [], education: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState('');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryClosing, setSummaryClosing] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const summaryTextareaRef = useRef(null);

  // Unsaved-changes tracking for beforeunload warning
  const cleanProfileRef = useRef(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const handler = (e) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    if (cleanProfileRef.current === null) return;
    isDirtyRef.current = JSON.stringify(profile) !== cleanProfileRef.current;
  }, [profile]);

  const closeSummaryModal = () => {
    setSummaryClosing(true);
    setTimeout(() => { setSummaryModalOpen(false); setSummaryClosing(false); }, 185);
  };

  // Saved answers state
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmAnswerId, setConfirmAnswerId] = useState(null);

  useEffect(() => {
    api.get('/profile').then(res => {
      const p = {
        summary: res.data.summary || '',
        phone: res.data.phone || '',
        linkedin: res.data.linkedin || '',
        github: res.data.github || '',
        website: res.data.website || '',
        skills: res.data.skills || [],
        experience: res.data.experience || [],
        education: res.data.education || [],
      };
      setProfile(p);
      cleanProfileRef.current = JSON.stringify(p);
      isDirtyRef.current = false;
    }).catch(console.error).finally(() => setLoading(false));

    // Load saved answers
    api.get('/profile/saved-answers').then(res => {
      setSavedAnswers(res.data);
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.put('/profile', profile);
      cleanProfileRef.current = JSON.stringify(profile);
      isDirtyRef.current = false;
      toast.success('Profile saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save profile. Please try again.');
    } finally { setSaving(false); }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (i) => {
    setProfile({ ...profile, skills: profile.skills.filter((_, idx) => idx !== i) });
  };

  const addExperience = () => {
    setProfile({ ...profile, experience: [...profile.experience, { title: '', company: '', duration: '', description: '' }] });
  };
  const updateExperience = (i, field, val) => {
    const exp = [...profile.experience];
    exp[i] = { ...exp[i], [field]: val };
    setProfile({ ...profile, experience: exp });
  };
  const removeExperience = (i) => {
    setProfile({ ...profile, experience: profile.experience.filter((_, idx) => idx !== i) });
  };

  const addEducation = () => {
    setProfile({ ...profile, education: [...profile.education, { degree: '', major: '', institution: '', start_year: '', end_year: '', gpa: '' }] });
  };
  const updateEducation = (i, field, val) => {
    const edu = [...profile.education];
    edu[i] = { ...edu[i], [field]: val };
    setProfile({ ...profile, education: edu });
  };
  const removeEducation = (i) => {
    setProfile({ ...profile, education: profile.education.filter((_, idx) => idx !== i) });
  };

  // Saved answers handlers
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.answer);
  };
  const saveEdit = async (id) => {
    try {
      const res = await api.put(`/profile/saved-answers/${id}`, { answer: editValue });
      setSavedAnswers(savedAnswers.map(a => a.id === id ? res.data : a));
      setEditingId(null);
    } catch (err) { console.error(err); }
  };
  const deleteAnswer = async () => {
    try {
      await api.delete(`/profile/saved-answers/${confirmAnswerId}`);
      setSavedAnswers(savedAnswers.filter(a => a.id !== confirmAnswerId));
      setConfirmAnswerId(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <Helmet><title>Profile | JobAssist AI</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <div style={{ height: 28, width: 90, borderRadius: 8, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 34, width: 72, borderRadius: 9999, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ height: 13, width: '35%', borderRadius: 6, background: 'var(--muted)', marginBottom: '0.85rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 40, borderRadius: 9999, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      <Helmet><title>Profile | JobAssist AI</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>

      {/* Summary Modal */}
      {summaryModalOpen && (
        <div
          className={summaryClosing ? 'animate-modal-bg-out' : 'animate-modal-bg'}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeSummaryModal(); }}
        >
          <div
            className={summaryClosing ? 'animate-modal-out' : 'animate-modal'}
            style={{
            background: '#141414', border: '1px solid #2a2a2a', borderRadius: 18,
            width: '100%', maxWidth: 680, maxHeight: '90vh',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #1f1f1f' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>Professional Summary</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 3 }}>Write a concise overview of your background and goals</p>
              </div>
              <button onClick={closeSummaryModal} title="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Textarea */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <textarea
                ref={summaryTextareaRef}
                value={summaryDraft}
                onChange={e => setSummaryDraft(e.target.value)}
                placeholder="Describe your professional background, key skills, and career goals..."
                rows={10}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10,
                  color: 'var(--foreground)', fontSize: '0.875rem', fontFamily: 'inherit',
                  lineHeight: 1.7, padding: '0.875rem 1rem',
                  resize: 'vertical', outline: 'none',
                  letterSpacing: '-0.01em',
                }}
                onFocus={e => e.target.style.borderColor = '#4a4a5a'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 6, textAlign: 'right' }}>
                {summaryDraft.length} characters
              </p>
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid #1f1f1f' }}>
              <button onClick={closeSummaryModal}
                style={{ padding: '7px 16px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a3a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                Cancel
              </button>
              <button
                onClick={() => { setProfile(p => ({ ...p, summary: summaryDraft })); closeSummaryModal(); }}
                style={{ padding: '7px 18px', background: '#202020', border: '1px solid #303030', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = '#202020'}
              >
                <Check size={14} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="card p-5 mb-4 animate-enter">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label className="section-label" style={{ margin: 0 }}>Professional Summary</label>
          <button
            onClick={() => { setSummaryDraft(profile.summary); setSummaryModalOpen(true); setTimeout(() => summaryTextareaRef.current?.focus(), 50); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8,
              padding: '4px 11px', fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
          >
            <Maximize2 size={12} /> Edit
          </button>
        </div>

        {/* Preview area */}
        {profile.summary ? (
          <div>
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              maxHeight: summaryExpanded ? 'none' : '4.8em',
              transition: 'max-height 0.3s ease',
            }}>
              <p style={{
                fontSize: '0.875rem', lineHeight: 1.75, color: 'var(--foreground)',
                fontFamily: 'inherit', letterSpacing: '-0.01em', margin: 0,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {profile.summary}
              </p>
              {!summaryExpanded && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.4em',
                  background: 'linear-gradient(to bottom, transparent, var(--card))',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
            <button
              onClick={() => setSummaryExpanded(v => !v)}
              style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', fontFamily: 'inherit',
              }}
            >
              {summaryExpanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Read more</>}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setSummaryDraft(''); setSummaryModalOpen(true); setTimeout(() => summaryTextareaRef.current?.focus(), 50); }}
            style={{
              width: '100%', padding: '1.5rem', background: 'rgba(99,102,241,0.05)',
              border: '1.5px dashed rgba(99,102,241,0.25)', borderRadius: 10,
              color: 'var(--muted-foreground)', fontSize: '0.83rem', fontFamily: 'inherit',
              cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.09)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
          >
            + Click to write your professional summary
          </button>
        )}
      </div>

      {/* Contact */}
      <div className="card p-5 mb-4 animate-enter" style={{ animationDelay: '0.05s' }}>
        <label className="section-label" style={{ marginBottom: '10px', display: 'block' }}>
          <Globe size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Contact & Links
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'phone', label: 'Phone', ph: '+91 1234 567 890' },
            { key: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/...' },
            { key: 'github', label: 'GitHub', ph: 'github.com/...' },
            { key: 'website', label: 'Website', ph: 'yoursite.com' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '3px' }}>{f.label}</label>
              <input value={profile[f.key]} onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                className="input-field" placeholder={f.ph} />
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="card p-5 mb-4 animate-enter" style={{ animationDelay: '0.1s' }}>
        <label className="section-label" style={{ marginBottom: '10px', display: 'block' }}>Skills</label>
        <div className="flex gap-2 mb-3">
          <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            className="input-field flex-1" placeholder="e.g. React, Python, SQL" />
          <button onClick={addSkill} className="btn-secondary flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s, i) => (
            <span key={i} className="skill-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {s}
              <button
                onClick={() => removeSkill(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', color: '#5a5a63' }}
                title={`Remove ${s}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {profile.skills.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>No skills added. Type above and press Enter.</p>
          )}
        </div>
      </div>

      {/* Experience */}
      <div className="card p-5 mb-4 animate-enter" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center justify-between mb-3">
          <label className="section-label">
            <Briefcase size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Experience
          </label>
          <button onClick={addExperience} className="btn-secondary flex items-center gap-1 text-xs">
            <Plus size={12} /> Add
          </button>
        </div>
        {profile.experience.map((exp, i) => (
          <div key={i} style={{
            padding: '12px', marginBottom: '8px', borderRadius: '8px',
            background: 'var(--muted)', border: '1px solid var(--border)',
            position: 'relative',
          }}>
            <button onClick={() => removeExperience(i)} title="Remove"
              className="bg-transparent border-none cursor-pointer"
              style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--muted-foreground)' }}>
              <X size={14} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input value={exp.title} onChange={(e) => updateExperience(i, 'title', e.target.value)}
                className="input-field" placeholder="Job title" />
              <input value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)}
                className="input-field" placeholder="Company" />
            </div>
            <input value={exp.duration} onChange={(e) => updateExperience(i, 'duration', e.target.value)}
              className="input-field" placeholder="Duration (e.g. Jan 2023 - Present)" style={{ marginBottom: '6px' }} />
            <textarea value={exp.description} onChange={(e) => updateExperience(i, 'description', e.target.value)}
              className="input-field" rows={2} placeholder="Description" />
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="card p-5 mb-4 animate-enter" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-3">
          <label className="section-label">
            <GraduationCap size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Education
          </label>
          <button onClick={addEducation} className="btn-secondary flex items-center gap-1 text-xs">
            <Plus size={12} /> Add
          </button>
        </div>
        {profile.education.map((edu, i) => {
          const labelSt = { display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
          return (
            <div key={i} style={{
              padding: '16px', marginBottom: '10px', borderRadius: '10px',
              background: 'var(--muted)', border: '1px solid var(--border)',
              position: 'relative',
            }}>
              <button onClick={() => removeEducation(i)} title="Remove"
                className="bg-transparent border-none cursor-pointer"
                style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--muted-foreground)' }}>
                <X size={14} />
              </button>

              {/* Row 1: Degree + Major */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5 pr-6">
                <div>
                  <label style={labelSt}>Degree</label>
                  <input value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                    className="input-field" placeholder="e.g. B.Tech, B.Sc, MBA" />
                </div>
                <div>
                  <label style={labelSt}>Major / Specialization</label>
                  <input value={edu.major || ''} onChange={(e) => updateEducation(i, 'major', e.target.value)}
                    className="input-field" placeholder="e.g. Computer Science, Finance" />
                </div>
              </div>

              {/* Row 2: Institution */}
              <div style={{ marginBottom: 10 }}>
                <label style={labelSt}>Institution</label>
                <input value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                  className="input-field" placeholder="e.g. Kalinga Institute of Industrial Technology" />
              </div>

              {/* Row 3: Start Year + End Year + GPA */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label style={labelSt}>Start Year</label>
                  <input
                    type="number" min="1900" max="2100"
                    value={edu.start_year || ''}
                    onChange={(e) => updateEducation(i, 'start_year', e.target.value)}
                    className="input-field" placeholder="e.g. 2023" />
                </div>
                <div>
                  <label style={labelSt}>End Year <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(or expected)</span></label>
                  <input
                    type="number" min="1900" max="2100"
                    value={edu.end_year || ''}
                    onChange={(e) => updateEducation(i, 'end_year', e.target.value)}
                    className="input-field" placeholder="e.g. 2027" />
                </div>
                <div>
                  <label style={labelSt}>GPA / Marks / %</label>
                  <input
                    value={edu.gpa || ''}
                    onChange={(e) => updateEducation(i, 'gpa', e.target.value)}
                    className="input-field" placeholder="e.g. 8.5, 92%" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Answers */}
      <div className="card p-5 animate-enter" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="section-label">
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Saved Answers
            </label>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
              Learned from form submissions · auto-filled on future forms
            </p>
          </div>
        </div>
        {savedAnswers.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            No saved answers yet. Fill out forms on the Autofill page and your answers will appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {savedAnswers.map(item => (
              <div key={item.id} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--muted)', border: '1px solid var(--border)',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>{item.question}</span>
                  <div className="flex items-center gap-1">
                    {editingId === item.id ? (
                      <button onClick={() => saveEdit(item.id)} title="Save"
                        className="bg-transparent border-none cursor-pointer"
                        style={{ color: '#10b981', padding: '2px' }}>
                        <Check size={14} />
                      </button>
                    ) : (
                      <button onClick={() => startEdit(item)} title="Edit"
                        className="bg-transparent border-none cursor-pointer"
                        style={{ color: 'var(--muted-foreground)', padding: '2px' }}>
                        <Pencil size={12} />
                      </button>
                    )}
                    <button onClick={() => setConfirmAnswerId(item.id)} title="Delete"
                      className="bg-transparent border-none cursor-pointer"
                      style={{ color: 'var(--muted-foreground)', padding: '2px' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {editingId === item.id ? (
                  <input value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                    className="input-field" autoFocus />
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAnswerId !== null}
        title="Delete saved answer"
        message="This answer will be permanently removed and won't be available for future autofills."
        confirmLabel="Delete"
        danger
        onConfirm={deleteAnswer}
        onCancel={() => setConfirmAnswerId(null)}
      />
    </div>
  );
}

