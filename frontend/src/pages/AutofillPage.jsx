import { useState } from 'react';
import api from '../api';
import { Wand2, Link2, Loader2, CheckCircle, AlertCircle, Zap, BriefcaseBusiness, X } from 'lucide-react';

const PLATFORMS = [
  { name: 'Google Forms', color: '#4285f4' },
  { name: 'MS Forms', color: '#00a4ef' },
  { name: 'Typeform', color: '#8b8b92' },
  { name: 'JotForm', color: '#d4942e' },
];

export default function AutofillPage() {
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [platform, setPlatform] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [detecting, setDetecting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [trackForm, setTrackForm] = useState(null); // { company, position, url }
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);

  const handleDetect = async () => {
    if (!url.trim()) return;
    setDetecting(true); setFields([]); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/detect-fields', { url });
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

  const handleAutoMap = async () => {
    setMapping(true);
    try {
      const fieldData = fields.map(f => ({
        field_id: f.field_id,
        label: f.label,
        field_type: f.field_type,
        options: f.options || [],
      }));
      const res = await api.post('/ai/auto-map', { fields: fieldData });
      if (res.data.field_values) {
        setFieldValues({ ...fieldValues, ...res.data.field_values });
      }
    } catch (err) { console.error(err); }
    finally { setMapping(false); }
  };

  const handleFill = async () => {
    setFilling(true); setResult(null); setError(''); setTracked(false); setTrackForm(null);
    try {
      const res = await api.post('/ai/fill-form', { url: formUrl, field_map: fieldValues });
      setResult(res.data);

      // Open the pre-filled form in a new tab
      if (res.data.prefilled_url) {
        window.open(res.data.prefilled_url, '_blank');
      }

      // Save filled field values for future auto-mapping
      const answersToSave = fields
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
      setTrackForm({ company, position, url: formUrl || url });

    } catch (err) {
      setError(err.response?.data?.detail || 'Fill failed');
    } finally { setFilling(false); }
  };

  const handleTrack = async () => {
    if (!trackForm) return;
    setTracking(true);
    try {
      await api.post('/applications', {
        company: trackForm.company || 'Unknown',
        position: trackForm.position || 'Unknown',
        status: 'draft',
        url: trackForm.url,
        notes: 'Auto-tracked via Autofill',
      });
      setTracked(true);
      setTrackForm(null);
    } catch (err) { console.error(err); }
    finally { setTracking(false); }
  };

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Autofill</h1>
        <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '2px' }}>Auto-fill forms on supported platforms</p>
      </div>

      {/* Platforms */}
      <div className="flex gap-2 mb-5">
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
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            className="input-field flex-1" placeholder="https://docs.google.com/forms/..." />
          <button onClick={handleDetect} disabled={detecting || !url.trim()}
            className="btn-primary flex items-center gap-2">
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

      {/* Fields */}
      {fields.length > 0 && (
        <div className="card p-5 mb-5 animate-enter">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="section-label">Detected Fields</label>
              <p style={{ fontSize: '0.75rem', color: '#5a5a63', marginTop: '2px' }}>
                {fields.length} fields · {platform.replace('_', ' ')}
              </p>
            </div>
            <button onClick={handleAutoMap} disabled={mapping} className="btn-secondary flex items-center gap-1 text-xs">
              {mapping ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              {mapping ? 'Mapping...' : 'Map from Profile'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map(field => (
              <div key={field.field_id} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{field.label}</span>
                  <span style={{
                    fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px',
                    background: 'var(--color-surface-overlay)', color: '#8b8b92',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  }}>{field.field_type}</span>
                </div>
                {field.field_type === 'radio' || field.field_type === 'dropdown' ? (
                  <select value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field">
                    <option value="">-- Select --</option>
                    {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                  </select>
                ) : field.field_type === 'checkbox' ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map((opt, i) => {
                      const selected = (fieldValues[field.field_id] || '').split(', ').includes(opt);
                      return (
                        <label key={i} className="flex items-center gap-1.5" style={{
                          fontSize: '0.8rem', cursor: 'pointer', padding: '4px 8px',
                          borderRadius: '6px', border: '1px solid var(--color-border)',
                          background: selected ? 'rgba(212,148,46,0.15)' : 'var(--color-surface)',
                          color: selected ? 'var(--color-primary)' : '#8b8b92',
                        }}>
                          <input type="checkbox" checked={selected} onChange={() => {
                            const current = fieldValues[field.field_id] ? fieldValues[field.field_id].split(', ').filter(Boolean) : [];
                            const next = selected ? current.filter(v => v !== opt) : [...current, opt];
                            setFieldValues({ ...fieldValues, [field.field_id]: next.join(', ') });
                          }} style={{ accentColor: 'var(--color-primary)' }} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : field.field_type === 'date' ? (
                  <input type="date" value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field" />
                ) : field.field_type === 'time' ? (
                  <input type="time" value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field" />
                ) : field.field_type === 'file' ? (
                  <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>File uploads must be done manually</p>
                ) : field.field_type === 'textarea' ? (
                  <textarea value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field" rows={3} placeholder={`Value for ${field.label}`} />
                ) : (
                  <input value={fieldValues[field.field_id] || ''}
                    onChange={(e) => setFieldValues({ ...fieldValues, [field.field_id]: e.target.value })}
                    className="input-field" placeholder={`Value for ${field.label}`} />
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
          <div className="flex items-center gap-3">
            {result.success ? <CheckCircle size={20} style={{ color: '#3eb370' }} /> : <AlertCircle size={20} style={{ color: '#d94f4f' }} />}
            <div>
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
              <a href={result.prefilled_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Track this application?</span>
            </div>
            <button onClick={() => setTrackForm(null)}
              className="bg-transparent border-none cursor-pointer" style={{ color: '#5a5a63' }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#8b8b92', marginBottom: '12px' }}>
            Log this to your Dashboard as "applied" — edit details below if needed.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>Company</label>
              <input className="input-field" value={trackForm.company}
                onChange={e => setTrackForm({ ...trackForm, company: e.target.value })}
                placeholder="Company name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#8b8b92', marginBottom: '4px' }}>Position / Role</label>
              <input className="input-field" value={trackForm.position}
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
