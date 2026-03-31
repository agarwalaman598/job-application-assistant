import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  Building2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  Tag,
  ChevronDown,
  Check,
} from 'lucide-react';
import api from '../api';
import { PageLoadingState } from '../components/PageLoadingState';

const DATE_POSTED_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'all', label: 'Any time' },
];

export default function SearchJobsPage() {
  const [query, setQuery] = useState('Software Engineer');
  const [location, setLocation] = useState('India');
  const [datePosted, setDatePosted] = useState('week');

  const [resumes, setResumes] = useState([]);
  const [selectedResumeIds, setSelectedResumeIds] = useState([]);

  const [loadingResumes, setLoadingResumes] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [resumeDropdownOpen, setResumeDropdownOpen] = useState(false);
  const resumeDropdownRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!resumeDropdownRef.current) return;
      if (!resumeDropdownRef.current.contains(event.target)) {
        setResumeDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchResumes() {
      setLoadingResumes(true);
      try {
        const res = await api.get('/resumes');
        if (!mounted) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        setResumes(rows);

        // Default-select the default resume so first search is one click.
        const defaultResume = rows.find((item) => item.is_default);
        if (defaultResume) {
          setSelectedResumeIds([defaultResume.id]);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          toast.error('Failed to load resumes');
        }
      } finally {
        if (mounted) {
          setLoadingResumes(false);
        }
      }
    }

    fetchResumes();
    return () => { mounted = false; };
  }, []);

  const selectedResumeNames = useMemo(() => {
    const selected = new Set(selectedResumeIds);
    return resumes
      .filter((resume) => selected.has(resume.id))
      .map((resume) => resume.filename);
  }, [resumes, selectedResumeIds]);

  const toggleResume = (resumeId) => {
    setSelectedResumeIds((prev) => {
      if (prev.includes(resumeId)) {
        return prev.filter((id) => id !== resumeId);
      }
      return [...prev, resumeId];
    });
  };

  const formatPostedAtIST = (postedAt) => {
    if (!postedAt) return '';
    const parsed = Date.parse(postedAt);
    if (Number.isNaN(parsed)) {
      return String(postedAt);
    }
    const formatted = new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(parsed));
    return `${formatted} IST`;
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a role or keyword');
      return;
    }
    if (selectedResumeIds.length === 0) {
      toast.error('Select at least one resume');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const response = await api.post('/jobs/search', {
        query: query.trim(),
        location: location.trim(),
        resume_ids: selectedResumeIds,
        date_posted: datePosted,
        page: 1,
        num_pages: 1,
      });
      setJobs(Array.isArray(response.data?.jobs) ? response.data.jobs : []);
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail || 'Search failed. Please try again.';
      toast.error(detail);
      setJobs([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto">
      <Helmet><title>Search Jobs | JobAssist AI</title></Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select one or more resumes, fetch fresh roles, and rank them by intelligent match score.
        </p>
      </div>

      <div className="card p-5 mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="section-label block mb-2">Role / Keywords</label>
            <input
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Backend Engineer"
            />
          </div>

          <div>
            <label className="section-label block mb-2">Location</label>
            <input
              className="input-field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </div>

          <div>
            <label className="section-label block mb-2">Freshness</label>
            <select
              className="input-field"
              value={datePosted}
              onChange={(e) => setDatePosted(e.target.value)}
            >
              {DATE_POSTED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4" ref={resumeDropdownRef}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="section-label">Select Resume(s)</label>
            <span className="text-xs text-muted-foreground">
              {selectedResumeIds.length} selected
            </span>
          </div>

          {loadingResumes ? (
            <PageLoadingState label="Loading resumes..." rows={2} framed={false} className="p-0" />
          ) : resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resumes found. Upload or add a resume first.
            </p>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setResumeDropdownOpen((prev) => !prev)}
                className="input-field flex w-full items-center justify-between gap-3 text-left"
                style={{ minHeight: 44 }}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedResumeNames.length > 0
                      ? selectedResumeNames.join(', ')
                      : 'Choose one or more resumes'}
                  </span>
                </span>
                <ChevronDown size={16} className="text-muted-foreground shrink-0" />
              </button>

              {resumeDropdownOpen && (
                <div
                  className="absolute z-30 mt-2 w-full rounded-lg border p-1.5"
                  style={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                    maxHeight: 280,
                    overflowY: 'auto',
                  }}
                >
                  {resumes.map((resume) => {
                    const selected = selectedResumeIds.includes(resume.id);
                    return (
                      <button
                        key={resume.id}
                        type="button"
                        onClick={() => toggleResume(resume.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors"
                        style={{ background: selected ? 'rgba(99,102,241,0.12)' : 'transparent' }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{resume.filename}</span>
                            {resume.is_default && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full border text-muted-foreground"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                Default
                              </span>
                            )}
                          </div>
                          {(resume.tags || []).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {(resume.tags || []).slice(0, 4).join(', ')}
                            </p>
                          )}
                        </div>
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded border shrink-0"
                          style={{
                            borderColor: selected ? 'var(--primary)' : 'var(--border)',
                            background: selected ? 'var(--primary)' : 'transparent',
                            color: 'var(--primary-foreground)',
                          }}
                        >
                          {selected ? <Check size={12} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={searching || loadingResumes || resumes.length === 0}
          className="btn-primary inline-flex items-center gap-2"
        >
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {searching ? 'Searching...' : 'Search & Rank Jobs'}
        </button>
      </div>

      {hasSearched && !searching && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sparkles size={13} /> Ranked by skill overlap, role match, and multi-resume boost.
          </span>
          {selectedResumeNames.length > 0 && (
            <span>Using: {selectedResumeNames.join(', ')}</span>
          )}
        </div>
      )}

      {searching ? (
        <PageLoadingState label="Finding fresh jobs and scoring matches..." rows={5} />
      ) : hasSearched && jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No ranked jobs found. Try broader keywords or add resume tags for better matching.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {jobs.map((job) => (
            <article key={`${job.job_id}-${job.apply_link}`} className="card p-4 md:p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight wrap-break-word">{job.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Building2 size={14} /> {job.company}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                    {job.posted_at && <span>Posted: {formatPostedAtIST(job.posted_at)}</span>}
                  </div>
                </div>

                <a
                  href={job.apply_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  Apply <ExternalLink size={13} />
                </a>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="rounded-lg border p-4 md:col-span-3" style={{ borderColor: 'var(--border)', background: 'rgba(99,102,241,0.08)' }}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Match Score</p>
                  <p className="text-2xl font-bold inline-flex items-center gap-1.5"><Star size={18} /> {job.score}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ranked for selected resume profile</p>
                </div>

                <div className="rounded-lg border p-4 md:col-span-4" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
                    <Tag size={12} /> Tags
                  </p>
                  {job.tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No skill overlap detected</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {job.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 md:col-span-5" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Matched Resume(s)</p>
                  {job.matched_resumes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5 text-sm text-foreground">
                      {job.matched_resumes.map((name) => (
                        <li
                          key={name}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1"
                          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
                        >
                          <FileText size={13} className="text-muted-foreground" /> {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
