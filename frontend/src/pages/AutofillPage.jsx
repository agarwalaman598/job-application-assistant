import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../api';
import { Wand2, Link2, Loader2, CheckCircle, AlertCircle, Zap, BriefcaseBusiness, X } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';

const PLATFORMS = [
  { name: 'Google Forms', color: '#4285f4' },
  { name: 'MS Forms', color: '#00a4ef' },
  { name: 'Typeform', color: '#8b8b92' },
  { name: 'JotForm', color: '#d4942e' },
];

export default function AutofillPage() {
  const [resumes, setResumes] = useState([]);
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [platform, setPlatform] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [detecting, setDetecting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [trackForm, setTrackForm] = useState(null); // { company, position, url, resume_id }
    const fetchResumes = async () => {
      try {
        const res = await api.get('/resumes');
        setResumes(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    useEffect(() => {
      fetchResumes();
    }, []);

  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);

  // Derived: only fields with a renderable input type (filters out headings,
  // display blocks, and any unknown types that slip through the backend).
  const VALID_TYPES = ['text', 'textarea', 'radio', 'dropdown', 'checkbox', 'date', 'time', 'file', 'email'];
  const visibleFields = fields.filter(f => VALID_TYPES.includes(f.field_type));

  const handleDetect = async () => {
    if (detecting || !url.trim()) return;
    setDetecting(true); 
    const startedAt = Date.now();
    setFields([]); setError(''); setResult(null); setMapError(''); setRecalledCount(null);
    try {
      const res = await api.post('/ai/detect-fields', { url });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setFields(res.data.fields);
      setPlatform(res.data.platform);
      setFormUrl(res.data.form_url || url);
      const vals = {};
      res.data.fields.forEach(f => { vals[f.field_id] = ''; });
      setFieldValues(vals);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to detect fields');
    } finally { setDetecting(false); }
  };

  const [mapping, setMapping] = useState(false);
  const [mapError, setMapError] = useState('');
  const [recalledCount, setRecalledCount] = useState(null); // number of saved answers used

  const handleAutoMap = async () => {
    setMapping(true);
    const startedAt = Date.now();
    setMapError(''); setRecalledCount(null);
    try {
      const fieldData = visibleFields.map(f => ({
        field_id: f.field_id,
        label: f.label,
        field_type: f.field_type,
        options: f.options || [],
      }));
      const res = await api.post('/ai/auto-map', { fields: fieldData });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      if (res.data.field_values) {
        setFieldValues({ ...fieldValues, ...res.data.field_values });
      }
      if (typeof res.data.saved_answers_count === 'number') {
        setRecalledCount(res.data.saved_answers_count);
      }
    } catch (err) {
      console.error(err);
      setMapError(err.response?.data?.detail || 'Auto-map failed. Check your profile is complete.');
    }
    finally { setMapping(false); }
  };

  const handleFill = async () => {
    setFilling(true);
    const startedAt = Date.now();
    setResult(null); setError(''); setTracked(false); setTrackForm(null);
    try {
      const res = await api.post('/ai/fill-form', { url: formUrl, field_map: fieldValues });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setResult(res.data);

      // Open the pre-filled form in a new tab
      if (res.data.prefilled_url) {
        window.open(res.data.prefilled_url, '_blank');
      }

      // Save filled field values for future auto-mapping
      const answersToSave = visibleFields
        .filter(f => fieldValues[f.field_id]?.trim())
        .map(f => ({ label: f.label, value: fieldValues[f.field_id] }));
      if (answersToSave.length > 0) {
        await api.post('/ai/save-answers', { fields: answersToSave });
      }

      // Build tracking prompt: extract company & position from field labels
      const labelLower = (f) => f.label.toLowerCase();
      const findValue = (keywords) => {
        const match = fields.find(f => keywords.some(k => labelLower(f).includes(k)));
        return match ? (fieldValues[match.field_id] || '') : '';
      };
      const company = findValue(['company', 'organisation', 'organization', 'employer', 'firm']);
      const position = findValue(['position', 'role', 'title', 'internship', 'job', 'designation', 'post']);
      const defaultResume = resumes.find(r => r.is_default) || resumes[0] || null;
      setTrackForm({
        company,
        position,
        url: formUrl || url,
        resume_id: defaultResume?.id || '',
      });

    } catch (err) {
      setError(err.response?.data?.detail || 'Fill failed');
    } finally { setFilling(false); }
  };

  const handleTrack = async () => {
    if (!trackForm) return;
    setTracking(true);
    const trackStartTime = Date.now();
    try {
      await api.post('/applications', {
        company: trackForm.company || 'Unknown',
        position: trackForm.position || 'Unknown',
        status: 'draft',
        url: trackForm.url,
        resume_id: trackForm.resume_id ? Number(trackForm.resume_id) : null,
        notes: 'Auto-tracked via Autofill',
      });
      const elapsedTime = Date.now() - trackStartTime;
      const remainingTime = Math.max(0, 800 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      setTracked(true);
      setTrackForm(null);
    } catch (err) { console.error(err); }
    finally { setTracking(false); }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      <Helmet><title>Autofill | JobAssist AI</title></Helmet>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Autofill</h1>
        <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '2px' }}>Auto-fill forms on supported platforms</p>
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PLATFORMS.map(p => (
          <span key={p.name} className="flex items-center gap-1.5 text-xs" style={{
            padding: '5px 10px', borderRadius: '6px',
            background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
            color: '#8b8b92',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name}
          </span>
        ))}
      </div>

      {/* URL input */}
      <div className="card p-5 mb-5 animate-enter">
        <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>
          <Link2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Form URL
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Textarea value={url} onChange={(e) => setUrl(e.target.value)}
            className="input-field flex-1" placeholder="https://docs.google.com/forms/..."
            minRows={1} maxRows={4} expandOnFocusRows={2} singleLine />
          <button onClick={handleDetect} disabled={detecting || !url.trim()}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            {detecting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Detect
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-5 flex items-center gap-3"
          style={{ borderColor: 'rgba(217, 79, 79, 0.2)' }}>
          <AlertCircle size={16} style={{ color: '#d94f4f' }} />
          <p style={{ fontSize: '0.8rem', color: '#d94f4f' }}>{error}</p>
        </div>
      )}

      {/* Initial state hint — shown before first detection */}
      {!detecting && fields.length === 0 && !error && !result && (
        <div className="card p-8 text-center animate-enter" style={{ opacity: 0.65 }}>
          <Wand2 size={26} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Enter a form URL above and click{' '}
            <strong style={{ color: 'var(--foreground)' }}>Detect</strong>{' '}
            to automatically fill application forms.
          </p>
        </div>
      )}

      {/* Fields */}
      {visibleFields.length > 0 && (
        <div className="card p-5 mb-5 animate-enter">
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 mb-3">
            <div>
              <label className="section-label">Detected Fields</label>
              <p style={{ fontSize: '0.75rem', color: '#5a5a63', marginTop: '2px' }}>
                {visibleFields.length} fields · {platform.replace('_', ' ')}
              </p>
            </div>
            <button onClick={handleAutoMap} disabled={mapping} className="btn-secondary flex items-center gap-1 text-xs">
              {mapping ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              {mapping ? 'Mapping...' : 'Map from Profile'}
            </button>
          </div>

          {/* Auto-map error */}
          {mapError && (
            <div className="flex items-center gap-2 mb-3" style={{
              padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem',
              background: 'rgba(217,79,79,0.07)', border: '1px solid rgba(217,79,79,0.2)',
              color: '#d94f4f',
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              {mapError}
            </div>
          )}

          {/* Recalled from memory indicator */}
          {recalledCount !== null && !mapError && (
            <div className="flex items-center gap-2 mb-3" style={{
              padding: '7px 12px', borderRadius: 8, fontSize: '0.75rem',
              background: recalledCount > 0 ? 'rgba(62,179,112,0.07)' : 'rgba(90,90,99,0.08)',
              border: `1px solid ${recalledCount > 0 ? 'rgba(62,179,112,0.2)' : 'rgba(90,90,99,0.15)'}`,
              color: recalledCount > 0 ? '#3eb370' : '#5a5a63',
            }}>
              <CheckCircle size={13} style={{ flexShrink: 0 }} />
              {recalledCount > 0
                ? `${recalledCount} saved answer${recalledCount !== 1 ? 's' : ''} recalled from memory`
                : 'No saved answers yet — fill and submit a form to start learning'}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {visibleFields.map(field => (
              <div key={field.field_id} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                minWidth: 0, overflow: 'hidden',
              }}>
                <div className="flex flex-wrap items-center gap-2 mb-2" style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{field.label}</span>
                  <span style={{
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px',
                    background: 'var(--color-surface-overlay)', color: '#8b8b92',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  }}>{field.field_type}</span>
                </div>
                {field.field_type === 'dropdown' ? (
                  <select value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field w-full" style={{ maxWidth: '100%' }}>
                    <option value="">-- Select --</option>
                    {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                ) : field.field_type === 'radio' ? (
                  field.options?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt, i) => {
                        const selected = fieldValues[field.field_id] === opt;
                        return (
                          <label key={i} className="flex items-center gap-1.5" style={{
                            fontSize: '0.8rem', cursor: 'pointer', padding: '4px 10px',
                            borderRadius: '6px', border: '1px solid var(--color-border)',
                            background: selected ? 'rgba(244,244,245,0.08)' : 'var(--color-surface)',
                            color: selected ? 'var(--foreground)' : '#8b8b92',
                            maxWidth: '100%', wordBreak: 'break-word',
                            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                            borderColor: selected ? '#3a3a3a' : 'var(--color-border)',
                          }}>
                            <input type="radio"
                              name={field.field_id}
                              checked={selected}
                              onChange={() => setFieldValues({ ...fieldValues, [field.field_id]: opt })}
                              style={{ accentColor: 'var(--foreground)', flexShrink: 0 }} />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input value={fieldValues[field.field_id] || ''}
                      onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                      className="input-field w-full" placeholder={`Value for ${field.label}`}
                      style={{ maxWidth: '100%' }} />
                  )
                ) : field.field_type === 'checkbox' ? (
                  field.options?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt, i) => {
                        const selected = (fieldValues[field.field_id] || '').split(', ').includes(opt);
                        return (
                          <label key={i} className="flex items-center gap-1.5" style={{
                            fontSize: '0.8rem', cursor: 'pointer', padding: '4px 8px',
                            borderRadius: '6px', border: '1px solid var(--color-border)',
                            background: selected ? 'rgba(212,148,46,0.15)' : 'var(--color-surface)',
                            color: selected ? 'var(--color-primary)' : '#8b8b92',
                            maxWidth: '100%', wordBreak: 'break-word',
                          }}>
                            <input type="checkbox" checked={selected} onChange={() => {
                              const current = fieldValues[field.field_id] ? fieldValues[field.field_id].split(', ').filter(Boolean) : [];
                              const next = selected ? current.filter(v => v !== opt) : [...current, opt];
                              setFieldValues({ ...fieldValues, [field.field_id]: next.join(', ') });
                            }} style={{ accentColor: 'var(--color-primary)', flexShrink: 0 }} />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input value={fieldValues[field.field_id] || ''}
                      onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                      className="input-field w-full" placeholder={`Value for ${field.label}`}
                      style={{ maxWidth: '100%' }} />
                  )
                ) : field.field_type === 'date' ? (
                  <input type="date" value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field w-full" style={{ maxWidth: '100%' }} />
                ) : field.field_type === 'time' ? (
                  <input type="time" value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field w-full" style={{ maxWidth: '100%' }} />
                ) : field.field_type === 'file' ? (
                  <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>File uploads must be done manually</p>
                ) : field.field_type === 'textarea' ? (
                  <Textarea value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field w-full" minRows={3} maxRows={12} placeholder={`Value for ${field.label}`}
                    style={{ maxWidth: '100%' }} />
                ) : (
                  <input value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field w-full" placeholder={`Value for ${field.label}`}
                    style={{ maxWidth: '100%' }} />
                )}
              </div>
            ))}
          </div>

          <button onClick={handleFill} disabled={filling}
            className="btn-primary flex items-center justify-center gap-2 mt-4" style={{ width: '100%' }}>
            {filling ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {filling ? 'Generating...' : 'Open Pre-filled Form'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-5 animate-enter">
          <div className="flex items-start gap-3" style={{ minWidth: 0 }}>
            {result.success ? <CheckCircle size={20} style={{ color: '#3eb370' }} /> : <AlertCircle size={20} style={{ color: '#d94f4f' }} />}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: result.success ? '#3eb370' : '#d94f4f' }}>
                {result.success ? 'Pre-filled form opened in new tab!' : 'Could not generate link'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#8b8b92' }}>
                {result.filled_count} fields pre-filled · answers saved for future use
              </p>
            </div>
          </div>
          {result.prefilled_url && (
            <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>If the tab didn't open, click below:</p>
              <a href={result.prefilled_url} target="_blank" rel="noopener noreferrer" className="hover-link-primary"
                style={{ fontSize: '0.75rem', color: 'var(--color-primary)', wordBreak: 'break-all', textDecoration: 'none' }}>
                Open pre-filled form →
              </a>
            </div>
          )}
          {result.errors?.length > 0 && (
            <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: 'rgba(217,79,79,0.05)' }}>
              {result.errors.map((e, i) => <p key={i} style={{ fontSize: '0.7rem', color: '#d94f4f' }}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Track Application Prompt */}
      {trackForm && !tracked && (
        <div className="card p-5 animate-enter" style={{ border: '1px solid rgba(212,148,46,0.3)', background: 'rgba(212,148,46,0.04)' }}>
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
              <BriefcaseBusiness size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Track this application?</span>
            </div>
            <button onClick={() => setTrackForm(null)}
              className="bg-transparent border-none cursor-pointer icon-btn" style={{ color: '#5a5a63' }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8b8b92', marginBottom: '12px' }}>
            Log this to your Dashboard as "applied" — edit details below if needed.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>Resume Used</label>
              <select
                className="input-field w-full"
                value={trackForm.resume_id || ''}
                onChange={e => setTrackForm({ ...trackForm, resume_id: e.target.value })}
              >
                <option value="">Not selected</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.filename}{r.is_default ? ' (Default)' : ''}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.68rem', color: '#8b8b92', marginTop: '4px' }}>Auto-selected from your default resume. You can change it.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>Company</label>
              <input className="input-field w-full" value={trackForm.company}
                onChange={e => setTrackForm({ ...trackForm, company: e.target.value })}
                placeholder="Company name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>Position / Role</label>
              <input className="input-field w-full" value={trackForm.position}
                onChange={e => setTrackForm({ ...trackForm, position: e.target.value })}
                placeholder="Position applied for" />
            </div>
          </div>
          <button onClick={handleTrack} disabled={tracking}
            className="btn-primary flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
            {tracking ? <Loader2 size={13} className="animate-spin" /> : <BriefcaseBusiness size={13} />}
            {tracking ? 'Tracking...' : 'Add to Dashboard'}
          </button>
        </div>
      )}

      {/* Tracked success */}
      {tracked && (
        <div className="card p-4 animate-enter flex items-center gap-3" style={{ border: '1px solid rgba(62,179,112,0.2)' }}>
          <CheckCircle size={16} style={{ color: '#3eb370' }} />
          <p style={{ fontSize: '0.82rem', color: '#3eb370' }}>
            Application tracked! View it in your <a href="/dashboard" style={{ color: '#3eb370', textDecoration: 'underline' }}>Dashboard</a>.
          </p>
        </div>
      )}
    </div>
  );
}
