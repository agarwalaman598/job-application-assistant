import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Briefcase, FileText, TrendingUp, Award, ArrowRight, Plus } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoadingState } from '../components/PageLoadingState';

function StatCard({ label, value, icon: Icon, color, bg, loading, sub }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '1.25rem 1.4rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--muted-foreground)',
        }}>
          {label}
        </span>
        <div style={{
          height: 52, width: 52, borderRadius: 14,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon style={{ height: 28, width: 28, color }} strokeWidth={1.75} />
        </div>
      </div>

      {/* Value + sub */}
      <div>
        {loading
          ? <div style={{ height: 44, width: 56, borderRadius: 8, background: 'var(--muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          : <p style={{ fontSize: 'clamp(1.7rem, 5.8vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color }}>
              {value}
            </p>
        }
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.35rem' }}>{sub}</p>
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: `linear-gradient(90deg, ${color}66, transparent)`,
      }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [apps, setApps]       = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/applications').then(r => setApps(r.data)).catch(() => {}),
      api.get('/resumes').then(r => setResumes(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     apps.length,
    interview: apps.filter(a => a.status === 'interview').length,
    offer:     apps.filter(a => a.status === 'offer').length,
    resumes:   resumes.length,
  };

  const recent = [...apps]
    .sort((a, b) => new Date((b.applied_at || 0) + 'Z') - new Date((a.applied_at || 0) + 'Z'))
    .slice(0, 5);

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
      <Helmet><title>Dashboard | JobAssist AI</title></Helmet>
      {/* Greeting */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Here&apos;s your job search progress</p>
        </div>
        <Link to="/applications">
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', background: '#202020', color: '#fff',
            border: '1px solid #303030', borderRadius: 10, fontWeight: 600,
            fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}>
            <Plus style={{ height: 15, width: 15 }} strokeWidth={2.5} />
            Add Application
          </button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total"      value={stats.total}     icon={Briefcase}  color="#818cf8" bg="rgba(99,102,241,0.18)"  sub="Applications sent"    loading={loading} />
        <StatCard label="Interviews" value={stats.interview} icon={TrendingUp} color="#fbbf24" bg="rgba(245,158,11,0.18)"  sub="Rounds scheduled"     loading={loading} />
        <StatCard label="Offers"     value={stats.offer}     icon={Award}      color="#34d399" bg="rgba(16,185,129,0.18)"  sub="Offers received"      loading={loading} />
        <StatCard label="Resumes"    value={stats.resumes}   icon={FileText}   color="#818cf8" bg="rgba(99,102,241,0.18)"  sub="Uploaded resumes"     loading={loading} />
      </div>

      {/* Recent applications */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
              Recent Applications
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', marginTop: 3 }}>
              Your latest job applications
            </p>
          </div>
          <Link to="/applications" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted-foreground)',
            textDecoration: 'none', letterSpacing: '-0.01em',
            padding: '5px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            transition: 'color 0.15s, border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.borderColor = '#3a3a3a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            View all <ArrowRight style={{ height: 13, width: 13 }} />
          </Link>
        </div>

        {loading ? (
          <PageLoadingState label="Loading dashboard data..." rows={3} className="p-6" framed={false} />
        ) : recent.length === 0 ? (
          <div style={{ padding: '3.5rem 0', textAlign: 'center' }}>
            <Briefcase style={{ height: 32, width: 32, margin: '0 auto 12px', color: 'var(--muted-foreground)', opacity: 0.35 }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>No applications yet.</p>
            <Link to="/applications">
              <button style={{ marginTop: 12, padding: '7px 18px', background: '#202020', color: '#fff', border: '1px solid #303030', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Add your first
              </button>
            </Link>
          </div>
        ) : (
          <div>
            {recent.map((app, i) => {
              const dateStr = app.applied_at
                ? new Date(app.applied_at + 'Z').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
                : null;
              return (
                <div key={app.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1.1rem 1.5rem',
                    borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
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

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p style={{
                        fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.02em',
                        color: 'var(--foreground)', fontFamily: 'inherit',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {app.company}
                      </p>
                      <StatusBadge status={app.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 3 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.position}
                      </span>
                      {dateStr && (
                        <>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.6rem' }}>●</span>
                          <span style={{ fontSize: '0.73rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                            {dateStr}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
