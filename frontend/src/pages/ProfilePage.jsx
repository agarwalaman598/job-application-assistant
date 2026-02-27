import { useState, useEffect } from 'react';
import api from '../api';
import { Save, Plus, X, Loader2, Briefcase, GraduationCap, Globe, BookOpen, Pencil, Trash2, Check } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    summary: '', phone: '', linkedin: '', github: '', website: '',
    skills: [], experience: [], education: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState('');

  // Saved answers state
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    api.get('/profile').then(res => {
      setProfile({
        summary: res.data.summary || '',
        phone: res.data.phone || '',
        linkedin: res.data.linkedin || '',
        github: res.data.github || '',
        website: res.data.website || '',
        skills: res.data.skills || [],
        experience: res.data.experience || [],
        education: res.data.education || [],
      });
    }).catch(console.error).finally(() => setLoading(false));

    // Load saved answers
    api.get('/profile/saved-answers').then(res => {
      setSavedAnswers(res.data);
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile', profile);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
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
    setProfile({ ...profile, education: [...profile.education, { degree: '', institution: '', year: '' }] });
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
  const deleteAnswer = async (id) => {
    try {
      await api.delete(`/profile/saved-answers/${id}`);
      setSavedAnswers(savedAnswers.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="pt-20 flex justify-center" style={{ color: '#5a5a63' }}>
      <Loader2 className="animate-spin" />
    </div>
  );

  return (
    <div className="pt-20 px-6 pb-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Profile</h1>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>

      {/* Summary */}
      <div className="card p-5 mb-4 animate-enter">
        <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>Professional Summary</label>
        <textarea value={profile.summary} onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
          className="input-field" rows={3} placeholder="Describe your professional background..." />
      </div>

      {/* Contact */}
      <div className="card p-5 mb-4 animate-enter" style={{ animationDelay: '0.05s' }}>
        <label className="section-label" style={{ marginBottom: '10px', display: 'block' }}>
          <Globe size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Contact & Links
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'phone', label: 'Phone', ph: '+1 234 567 890' },
            { key: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/...' },
            { key: 'github', label: 'GitHub', ph: 'github.com/...' },
            { key: 'website', label: 'Website', ph: 'yoursite.com' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b8b92', marginBottom: '3px' }}>{f.label}</label>
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
            <p style={{ fontSize: '0.8rem', color: '#5a5a63' }}>No skills added. Type above and press Enter.</p>
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
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            position: 'relative',
          }}>
            <button onClick={() => removeExperience(i)}
              className="bg-transparent border-none cursor-pointer"
              style={{ position: 'absolute', top: '8px', right: '8px', color: '#5a5a63' }}>
              <X size={14} />
            </button>
            <div className="grid grid-cols-2 gap-2 mb-2">
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
        {profile.education.map((edu, i) => (
          <div key={i} style={{
            padding: '12px', marginBottom: '8px', borderRadius: '8px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            position: 'relative',
          }}>
            <button onClick={() => removeEducation(i)}
              className="bg-transparent border-none cursor-pointer"
              style={{ position: 'absolute', top: '8px', right: '8px', color: '#5a5a63' }}>
              <X size={14} />
            </button>
            <div className="grid grid-cols-3 gap-2">
              <input value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                className="input-field" placeholder="Degree" />
              <input value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                className="input-field" placeholder="Institution" />
              <input value={edu.year} onChange={(e) => updateEducation(i, 'year', e.target.value)}
                className="input-field" placeholder="Year" />
            </div>
          </div>
        ))}
      </div>

      {/* Saved Answers */}
      <div className="card p-5 animate-enter" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="section-label">
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Saved Answers
            </label>
            <p style={{ fontSize: '0.7rem', color: '#5a5a63', marginTop: '2px' }}>
              Learned from form submissions · auto-filled on future forms
            </p>
          </div>
        </div>
        {savedAnswers.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: '#5a5a63' }}>
            No saved answers yet. Fill out forms on the Autofill page and your answers will appear here.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {savedAnswers.map(item => (
              <div key={item.id} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: '0.75rem', color: '#8b8b92', fontWeight: 500 }}>{item.question}</span>
                  <div className="flex items-center gap-1">
                    {editingId === item.id ? (
                      <button onClick={() => saveEdit(item.id)}
                        className="bg-transparent border-none cursor-pointer"
                        style={{ color: '#3eb370', padding: '2px' }}>
                        <Check size={14} />
                      </button>
                    ) : (
                      <button onClick={() => startEdit(item)}
                        className="bg-transparent border-none cursor-pointer"
                        style={{ color: '#8b8b92', padding: '2px' }}>
                        <Pencil size={12} />
                      </button>
                    )}
                    <button onClick={() => deleteAnswer(item.id)}
                      className="bg-transparent border-none cursor-pointer"
                      style={{ color: '#5a5a63', padding: '2px' }}>
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text)' }}>{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

