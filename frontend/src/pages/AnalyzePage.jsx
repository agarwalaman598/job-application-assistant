import { useState, useRef, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../api';
import MatchScoreGauge from '../components/MatchScoreGauge';
import { Search, CheckCircle, XCircle, Loader2, FileText, MessageSquare, Sparkles, FileCheck, Maximize2, X, Check, Target, Lightbulb } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Textarea } from '../components/ui/textarea';

export default function AnalyzePage() {
  const [jd, setJd] = useState('');
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [jdClosing, setJdClosing] = useState(false);
  const [jdDraft, setJdDraft] = useState('');
  const jdTextareaRef = useRef(null);

  const closeJdModal = () => {
    setJdClosing(true);
    setTimeout(() => { setJdModalOpen(false); setJdClosing(false); }, 185);
  };
  const [matchResult, setMatchResult] = useState(null);
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [displayedAnswer, setDisplayedAnswer] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef(null);
  const [genLoading, setGenLoading] = useState(false);

  const normalizeSkillGroups = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((group) => {
        if (Array.isArray(group)) {
          const cleaned = group.filter((s) => typeof s === 'string' && s.trim());
          return cleaned.length ? cleaned : null;
        }
        if (typeof group === 'string' && group.trim()) {
          return [group.trim()];
        }
        return null;
      })
      .filter(Boolean);
  };

  const formatSkillGroup = (group) => (Array.isArray(group) ? group.join(' / ') : String(group || ''));

  const matchedSkills = normalizeSkillGroups(matchResult?.matched_skills);
  const missingSkills = normalizeSkillGroups(matchResult?.missing_skills);
  const matchedKeywords = Array.isArray(matchResult?.matched_keywords) ? matchResult.matched_keywords : [];
  const missingKeywords = Array.isArray(matchResult?.missing_keywords) ? matchResult.missing_keywords : [];
  const bonusSkillsMatched = Array.isArray(matchResult?.preferred_skills_matched) ? matchResult.preferred_skills_matched : [];
  const suggestions = Array.isArray(matchResult?.suggestions) ? matchResult.suggestions : [];
  const fallbackTopActions = [
    'Add deployment experience (Docker / cloud)',
    'Contribute to open-source or collaborative projects',
    'Highlight measurable impact in your project outcomes',
  ];
  const actionPool = [
    ...(Array.isArray(matchResult?.top_actions) ? matchResult.top_actions : suggestions),
    ...fallbackTopActions,
  ]
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  const topActions = [];
  for (const action of actionPool) {
    if (topActions.includes(action)) continue;
    topActions.push(action);
    if (topActions.length === 3) break;
  }
  const preferredSkills = Array.isArray(jdAnalysis?.preferred_skills)
    ? jdAnalysis.preferred_skills
    : (Array.isArray(jdAnalysis?.nice_to_have_skills) ? jdAnalysis.nice_to_have_skills : []);
  const matchedRequiredCount = matchedSkills.length;
  const totalRequiredCount = matchedSkills.length + missingSkills.length;
  const missingRequiredPreview = missingSkills.slice(0, 2).map(formatSkillGroup).join(', ');
  const matchedPreferredSet = new Set(bonusSkillsMatched.map((skill) => String(skill || '').trim().toLowerCase()));
  const missingPreferredSkills = preferredSkills.filter((skill) => !matchedPreferredSet.has(String(skill || '').trim().toLowerCase()));
  const requiredSkills = normalizeSkillGroups(jdAnalysis?.required_skills);
  const resumeStrengths = Array.isArray(jdAnalysis?.resume_strengths) ? jdAnalysis.resume_strengths : [];
  const resumeGaps = Array.isArray(jdAnalysis?.resume_gaps) ? jdAnalysis.resume_gaps : [];

  // Cleanup typing interval on unmount
  useEffect(() => () => { if (typingRef.current) clearInterval(typingRef.current); }, []);

  const animateAnswer = useCallback((text) => {
    if (typingRef.current) clearInterval(typingRef.current);
    setDisplayedAnswer('');
    setIsTyping(true);
    // Normalize to ~3 s regardless of answer length (~200 ticks @ 15 ms)
    const charsPerTick = Math.max(1, Math.ceil(text.length / 200));
    let pos = 0;
    typingRef.current = setInterval(() => {
      pos = Math.min(pos + charsPerTick, text.length);
      setDisplayedAnswer(text.slice(0, pos));
      if (pos >= text.length) {
        clearInterval(typingRef.current);
        typingRef.current = null;
        setIsTyping(false);
      }
    }, 15);
  }, []);
  const [alertMsg, setAlertMsg] = useState(null);

  const getJdWordCount = (text) => {
    const matches = String(text || '').match(/[A-Za-z][A-Za-z0-9+#./-]*/g);
    return matches ? matches.length : 0;
  };

  const isShortJd = jd.trim() && getJdWordCount(jd) < 20;

  const handleAnalyze = async () => {
    if (loading || !jd.trim()) return;
    setLoading(true);
    const startedAt = Date.now();
    setMatchResult(null);
    setJdAnalysis(null);
    setDisplayedAnswer('');
    if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null; }
    setIsTyping(false);
    try {
      const [matchRes, analyzeRes] = await Promise.all([
        api.post('/ai/match', { job_description: jd }),
        api.post('/ai/analyze-jd', { job_description: jd }),
      ]);
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setMatchResult(matchRes.data);
      setJdAnalysis(analyzeRes.data);
    } catch (err) {
      setAlertMsg(err.response?.data?.detail || 'Analysis failed. Fill out your Profile first.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (genLoading || !question.trim()) return;
    setGenLoading(true);
    const startedAt = Date.now();
    try {
      const res = await api.post('/ai/generate-answer', { question, job_description: jd });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      animateAnswer(res.data.answer);
    } catch (err) { 
      console.error(err);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      <Helmet><title>Analyze Resume | JobAssist AI</title></Helmet>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Analyze JD</h1>
        <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '2px' }}>
          Match your <strong style={{ color: '#8b8b92' }}>profile & resume</strong> against a job description
        </p>
      </div>

      {/* JD Modal */}
      {jdModalOpen && (
        <div
          className={jdClosing ? 'animate-modal-bg-out' : 'animate-modal-bg'}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeJdModal(); }}
        >
          <div
            className={jdClosing ? 'animate-modal-out' : 'animate-modal'}
            style={{
              background: '#141414', border: '1px solid #2a2a2a', borderRadius: 18,
              width: '100%', maxWidth: 720, maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ padding: '1rem 1rem', borderBottom: '1px solid #1f1f1f' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>Job Description</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 3 }}>Paste the full job description to analyze against your profile</p>
              </div>
              <button onClick={closeJdModal} title="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Textarea */}
            <div style={{ padding: '1rem 1rem' }}>
              <Textarea
                ref={jdTextareaRef}
                value={jdDraft}
                onChange={e => setJdDraft(e.target.value)}
                placeholder="Paste the full job description here..."
                minRows={14}
                maxRows={24}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10,
                  color: 'var(--foreground)', fontSize: '0.875rem', fontFamily: 'inherit',
                  lineHeight: 1.7, padding: '0.875rem 1rem',
                  outline: 'none', letterSpacing: '-0.01em',
                }}
                onFocus={e => e.target.style.borderColor = '#4a4a5a'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 6, textAlign: 'right' }}>
                {jdDraft.length} characters
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end" style={{ gap: 8, padding: '1rem 1rem', borderTop: '1px solid #1f1f1f' }}>
              <button onClick={closeJdModal}
                style={{ padding: '7px 16px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a3a'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                Cancel
              </button>
              <button
                onClick={() => { setJd(jdDraft); closeJdModal(); }}
                style={{ padding: '7px 18px', background: '#202020', border: '1px solid #303030', borderRadius: 9, fontSize: '0.82rem', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={e => e.currentTarget.style.background = '#202020'}
              >
                <Check size={14} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JD Input card */}
      <div className="card p-5 mb-5 animate-enter">
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label className="section-label" style={{ margin: 0 }}>
            <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Job Description
          </label>
          <button
            onClick={() => { setJdDraft(jd); setJdModalOpen(true); setTimeout(() => jdTextareaRef.current?.focus(), 50); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8,
              padding: '4px 11px', fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
          >
            <Maximize2 size={12} /> Expand
          </button>
        </div>

        {/* Inline textarea (still usable directly) */}
        <Textarea value={jd} onChange={e => setJd(e.target.value)}
          className="input-field" minRows={5} maxRows={18}
          placeholder="Paste the job description here, or click Expand for a larger editor..." />

        {isShortJd && (
          <p style={{ fontSize: '0.75rem', color: '#d4942e', marginTop: 8 }}>
            This is a short JD. Results may be limited.
          </p>
        )}

        <button onClick={handleAnalyze} disabled={loading || !jd.trim()}
          className="btn-primary flex items-center gap-2 mt-3">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {/* Initial state hint — shown before first analysis */}
      {!matchResult && !loading && (
        <div className="card p-8 text-center animate-enter" style={{ opacity: 0.65 }}>
          <Search size={26} style={{ color: 'var(--muted-foreground)', margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            Paste a job description above and click{' '}
            <strong style={{ color: 'var(--foreground)' }}>Analyze</strong>{' '}
            to see your match score, missing skills, and suggestions.
          </p>
        </div>
      )}

      {/* Match results */}
      {matchResult && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <div className="card p-5 flex flex-col items-center justify-center animate-enter">
            <MatchScoreGauge score={matchResult.match_score} />
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} style={{ color: '#3eb370' }} />
              <span className="section-label" style={{ color: '#3eb370' }}>Matched Required Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {matchedSkills.length > 0 ? matchedSkills.map((group, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(62, 179, 112, 0.08)', color: '#3eb370', border: '1px solid rgba(62, 179, 112, 0.15)',
                }}>{formatSkillGroup(group)}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>None matched. Add skills on Profile page.</p>
              )}
            </div>
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={14} style={{ color: '#d94f4f' }} />
              <span className="section-label" style={{ color: '#d94f4f' }}>Missing Required Skills</span>
            </div>
            <div style={{ marginBottom: missingPreferredSkills.length > 0 ? '12px' : 0 }}>
              <p style={{ fontSize: '0.7rem', color: '#d94f4f', marginBottom: '6px' }}>🔴 Critical Gaps (required)</p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.length > 0 ? missingSkills.map((group, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                    background: 'rgba(217, 79, 79, 0.08)', color: '#d94f4f', border: '1px solid rgba(217, 79, 79, 0.15)',
                  }}>{formatSkillGroup(group)}</span>
                )) : (
                  <p style={{ fontSize: '0.75rem', color: '#3eb370', margin: 0 }}>✔ You meet all required skills</p>
                )}
              </div>
            </div>

            {missingPreferredSkills.length > 0 && (
              <div>
                <p style={{ fontSize: '0.7rem', color: '#d4942e', marginBottom: '6px' }}>🟡 Optional Improvements (preferred)</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingPreferredSkills.map((skill, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                      background: 'rgba(212, 148, 46, 0.08)', color: '#d4942e', border: '1px solid rgba(212, 148, 46, 0.15)',
                    }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} style={{ color: '#4f8ef7' }} />
              <span className="section-label" style={{ color: '#4f8ef7' }}>Preferred Skills Matched (Bonus)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bonusSkillsMatched.length > 0 ? bonusSkillsMatched.map((s, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(79, 142, 247, 0.08)', color: '#4f8ef7', border: '1px solid rgba(79, 142, 247, 0.18)',
                }}>{s}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>No preferred bonus skills matched yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.16s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} style={{ color: '#d4942e' }} />
            <span className="section-label" style={{ color: '#d4942e' }}>🔥 Top 3 Actions to Improve Your Match</span>
          </div>
          {topActions.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topActions.map((action, index) => (
                <li key={index} style={{ fontSize: '0.82rem', color: '#ececed', lineHeight: 1.6 }}>
                  {action}
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#5a5a63', margin: 0 }}>No suggestions available yet.</p>
          )}
        </div>

        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.17s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} style={{ color: 'var(--color-primary)' }} />
            <span className="section-label">Why this score?</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: '0.82rem', color: '#ececed', margin: 0 }}>
              ✔ Matched {matchedRequiredCount} out of {totalRequiredCount} required skills
            </p>
            <p style={{ fontSize: '0.82rem', color: '#ececed', margin: 0 }}>
              ❌ Missing: {missingRequiredPreview || 'No major required gaps'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="card p-5 animate-enter" style={{ animationDelay: '0.18s' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} style={{ color: '#3eb370' }} />
              <span className="section-label" style={{ color: '#3eb370' }}>Matched Keywords</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.length > 0 ? matchedKeywords.map((keyword, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(62, 179, 112, 0.08)', color: '#3eb370', border: '1px solid rgba(62, 179, 112, 0.15)',
                }}>{keyword}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>No required keywords matched yet.</p>
              )}
            </div>
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={14} style={{ color: '#d94f4f' }} />
              <span className="section-label" style={{ color: '#d94f4f' }}>Missing Keywords</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.length > 0 ? missingKeywords.map((keyword, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(217, 79, 79, 0.08)', color: '#d94f4f', border: '1px solid rgba(217, 79, 79, 0.15)',
                }}>{keyword}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>No missing required keywords.</p>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Score Breakdown */}
      {matchResult?.breakdown && (
        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} style={{ color: 'var(--color-primary)' }} />
            <label className="section-label" style={{ margin: 0 }}>Score Breakdown</label>
          </div>
          {matchResult.reasoning && (
            <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontStyle: 'italic', marginBottom: 14 }}>
              {matchResult.reasoning}
            </p>
          )}
          {[
            { label: 'Keyword Coverage', key: 'keyword_score', weight: '40%', color: '#4f8ef7' },
            { label: 'Skills Match',     key: 'skills_score',   weight: '30%', color: '#3eb370' },
            { label: 'Experience Match', key: 'experience_score', weight: '20%', color: '#d4942e' },
            { label: 'Education Match',  key: 'education_score', weight: '10%', color: '#9b6dff' },
          ].map(({ label, key, weight, color }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', fontWeight: 500 }}>{label}</span>
                  <span style={{
                    fontSize: '0.65rem', color: 'var(--muted-foreground)',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    padding: '1px 6px', borderRadius: 4,
                  }}>{weight}</span>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{Math.round(matchResult.breakdown[key])}</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: '#2a2a2a', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: color,
                  width: `${matchResult.breakdown[key]}%`,
                  transition: 'width 0.9s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* JD Analysis */}
      {jdAnalysis && (
        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.15s' }}>
          <label className="section-label" style={{ marginBottom: '12px', display: 'block' }}>JD Breakdown</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Position', val: jdAnalysis.title },
              { label: 'Company', val: jdAnalysis.company },
              { label: 'Level', val: jdAnalysis.experience_level },
              { label: 'Summary', val: jdAnalysis.summary },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: '0.7rem', color: '#5a5a63', marginBottom: '2px' }}>{f.label}</p>
                <p style={{ fontSize: '0.85rem', color: '#ececed' }}>{f.val}</p>
              </div>
            ))}
          </div>
          {requiredSkills.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '0.7rem', color: '#5a5a63', marginBottom: '6px' }}>Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {requiredSkills.map((group, i) => <span key={i} className="skill-tag">{formatSkillGroup(group)}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resume Fit */}
      {jdAnalysis && (jdAnalysis.resume_fit || resumeStrengths.length > 0 || resumeGaps.length > 0) && (
        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileCheck size={14} style={{ color: 'var(--color-primary)' }} />
            <label className="section-label">Resume Fit Analysis</label>
          </div>

          {jdAnalysis.resume_fit && (
            <p style={{ fontSize: '0.85rem', color: '#ececed', lineHeight: '1.6', marginBottom: '14px',
              padding: '10px 14px', borderRadius: '8px', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)' }}>
              {jdAnalysis.resume_fit}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumeStrengths.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle size={12} style={{ color: '#3eb370' }} />
                  <span style={{ fontSize: '0.7rem', color: '#3eb370', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strengths from your resume</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px' }}>
                  {resumeStrengths.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: '#8b8b92', marginBottom: '4px' }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {resumeGaps.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle size={12} style={{ color: '#d94f4f' }} />
                  <span style={{ fontSize: '0.7rem', color: '#d94f4f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gaps to address</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px' }}>
                  {resumeGaps.map((g, i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: '#8b8b92', marginBottom: '4px' }}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer generator */}
      {matchResult && (
        <div className="card p-5 animate-enter" style={{ animationDelay: '0.2s' }}>
          <label className="section-label" style={{ marginBottom: '10px', display: 'block' }}>
            <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            AI Answer Generator
          </label>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)}
            className="input-field mb-3" minRows={2} maxRows={10}
            placeholder="e.g. Why do you want to work at this company?" />
          <button onClick={handleGenerate} disabled={genLoading || isTyping || !question.trim()}
            className="btn-primary flex items-center gap-2">
            {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {genLoading ? 'Generating...' : 'Generate'}
          </button>
          {(displayedAnswer || isTyping) && (
            <div style={{
              marginTop: '12px', padding: '14px', borderRadius: '8px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              fontSize: '0.85rem', lineHeight: '1.6', color: '#ececed',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {displayedAnswer}
              {isTyping && <span className="typing-cursor" />}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!alertMsg}
        title="Analysis failed"
        message={alertMsg}
        confirmLabel="Got it"
        onConfirm={() => setAlertMsg(null)}
      />
    </div>
  );
}
