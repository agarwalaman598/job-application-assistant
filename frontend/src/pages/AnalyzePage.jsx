import { useState } from 'react';
import api from '../api';
import MatchScoreGauge from '../components/MatchScoreGauge';
import { Search, CheckCircle, XCircle, Loader2, FileText, MessageSquare, Sparkles, FileCheck } from 'lucide-react';

export default function AnalyzePage() {
  const [jd, setJd] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setMatchResult(null);
    setJdAnalysis(null);
    setAnswer('');
    try {
      const [matchRes, analyzeRes] = await Promise.all([
        api.post('/ai/match', { job_description: jd }),
        api.post('/ai/analyze-jd', { job_description: jd }),
      ]);
      setMatchResult(matchRes.data);
      setJdAnalysis(analyzeRes.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Analysis failed. Fill out your Profile first.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!question.trim()) return;
    setGenLoading(true);
    try {
      const res = await api.post('/ai/generate-answer', { question, job_description: jd });
      setAnswer(res.data.answer);
    } catch (err) { console.error(err); }
    finally { setGenLoading(false); }
  };

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Analyze JD</h1>
        <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '2px' }}>
          Match your <strong style={{ color: '#8b8b92' }}>profile & resume</strong> against a job description
        </p>
      </div>

      {/* Input */}
      <div className="card p-5 mb-5 animate-enter">
        <label className="section-label" style={{ marginBottom: '8px', display: 'block' }}>
          <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Job Description
        </label>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)}
          className="input-field" rows={7}
          placeholder="Paste the full job description here..." />
        <button onClick={handleAnalyze} disabled={loading || !jd.trim()}
          className="btn-primary flex items-center gap-2 mt-3">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {/* Match results */}
      {matchResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="card p-5 flex flex-col items-center justify-center animate-enter">
            <MatchScoreGauge score={matchResult.match_score} />
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} style={{ color: '#3eb370' }} />
              <span className="section-label" style={{ color: '#3eb370' }}>Skills You Have</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchResult.matched_skills.length > 0 ? matchResult.matched_skills.map((s, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(62, 179, 112, 0.08)', color: '#3eb370', border: '1px solid rgba(62, 179, 112, 0.15)',
                }}>{s}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>None matched. Add skills on Profile page.</p>
              )}
            </div>
          </div>

          <div className="card p-5 animate-enter" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={14} style={{ color: '#d94f4f' }} />
              <span className="section-label" style={{ color: '#d94f4f' }}>Skills You're Missing</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchResult.missing_skills.length > 0 ? matchResult.missing_skills.map((s, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: '5px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                  background: 'rgba(217, 79, 79, 0.08)', color: '#d94f4f', border: '1px solid rgba(217, 79, 79, 0.15)',
                }}>{s}</span>
              )) : (
                <p style={{ fontSize: '0.75rem', color: '#5a5a63' }}>You cover everything!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* JD Analysis */}
      {jdAnalysis && (
        <div className="card p-5 mb-5 animate-enter" style={{ animationDelay: '0.15s' }}>
          <label className="section-label" style={{ marginBottom: '12px', display: 'block' }}>JD Breakdown</label>
          <div className="grid grid-cols-2 gap-4">
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
          {jdAnalysis.required_skills?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '0.7rem', color: '#5a5a63', marginBottom: '6px' }}>Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {jdAnalysis.required_skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resume Fit */}
      {jdAnalysis && (jdAnalysis.resume_fit || jdAnalysis.resume_strengths?.length > 0 || jdAnalysis.resume_gaps?.length > 0) && (
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
            {jdAnalysis.resume_strengths?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle size={12} style={{ color: '#3eb370' }} />
                  <span style={{ fontSize: '0.7rem', color: '#3eb370', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strengths from your resume</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px' }}>
                  {jdAnalysis.resume_strengths.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.8rem', color: '#8b8b92', marginBottom: '4px' }}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {jdAnalysis.resume_gaps?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle size={12} style={{ color: '#d94f4f' }} />
                  <span style={{ fontSize: '0.7rem', color: '#d94f4f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gaps to address</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px' }}>
                  {jdAnalysis.resume_gaps.map((g, i) => (
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
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
            className="input-field mb-3" rows={2}
            placeholder="e.g. Why do you want to work at this company?" />
          <button onClick={handleGenerate} disabled={genLoading || !question.trim()}
            className="btn-primary flex items-center gap-2">
            {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {genLoading ? 'Generating...' : 'Generate'}
          </button>
          {answer && (
            <div style={{
              marginTop: '12px', padding: '14px', borderRadius: '8px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              fontSize: '0.85rem', lineHeight: '1.6', color: '#ececed',
            }}>{answer}</div>
          )}
        </div>
      )}
    </div>
  );
}
