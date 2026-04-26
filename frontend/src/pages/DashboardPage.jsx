import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Briefcase, ArrowRight, Plus } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoadingState } from '../components/PageLoadingState';
import { DashboardIconSet } from '../components/ui/DashboardIconSet';

function StatCard({ label, value, iconName, color, bg, loading, sub, iconSize = 34, showIconBox = true }) {
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
          height: 52,
          width: 52,
          borderRadius: 14,
          background: showIconBox ? bg : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DashboardIconSet name={iconName} style={{ height: iconSize, width: iconSize }} />
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
          <button className="btn-lift" style={{
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
        <StatCard label="Total"      value={stats.total}     iconName="briefcase" color="#818cf8" bg="rgba(99,102,241,0.12)"  sub="Applications sent"    loading={loading} iconSize="clamp(2.25rem, 1.95rem + 0.65vw, 2.7rem)" />
        <StatCard label="Interviews" value={stats.interview} iconName="growth"    color="#fbbf24" bg="rgba(245,158,11,0.12)"  sub="Rounds scheduled"     loading={loading} iconSize="clamp(2.25rem, 1.95rem + 0.65vw, 2.7rem)" />
        <StatCard label="Offers"     value={stats.offer}     iconName="badge"     color="#34d399" bg="rgba(16,185,129,0.12)"  sub="Offers received"      loading={loading} iconSize="clamp(2.25rem, 1.95rem + 0.65vw, 2.7rem)" />
        <StatCard label="Resumes"    value={stats.resumes}   iconName="profile"   color="#818cf8" bg="rgba(99,102,241,0.12)"  sub="Uploaded resumes"     loading={loading} iconSize="clamp(2.25rem, 1.95rem + 0.65vw, 2.7rem)" />
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
              <button className="btn-lift" style={{ marginTop: 12, padding: '7px 18px', background: '#202020', color: '#fff', border: '1px solid #303030', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                    display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
                    padding: '1.1rem 1.5rem',
                    borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Serial number */}
                  <div style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted-foreground)',
                    fontFamily: 'inherit', letterSpacing: '-0.01em', minWidth: 16,
                  }}>
                    {i + 1}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <p style={{
                        fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em',
                        color: 'var(--foreground)', fontFamily: 'inherit',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {app.company}
                      </p>
                      <StatusBadge status={app.status} />
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: '0.83rem', color: 'var(--muted-foreground)', fontFamily: 'inherit', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {app.position}
                      </span>
                    </div>
                    {(app.resume_filename || dateStr) && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: 10,
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '0.35rem',
                        }}
                      >
                        {app.resume_filename && (
                          <p
                            title={app.resume_filename}
                            style={{
                              margin: 0,
                              minWidth: 0,
                              maxWidth: '100%',
                              fontSize: '0.8rem',
                              lineHeight: 1.35,
                              color: 'var(--muted-foreground)',
                              fontFamily: 'inherit',
                              overflowWrap: 'break-word',
                              wordBreak: 'break-word',
                            }}
                          >
                            <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Resume:</span>{' '}
                            <span>{app.resume_filename}</span>
                          </p>
                        )}
                        {app.resume_filename && dateStr && (
                          <span style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.12)' }} />
                        )}
                        {dateStr && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', lineHeight: 1.35, color: 'var(--muted-foreground)', fontFamily: 'inherit' }}>
                            <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Applied</span>
                            <span style={{ color: 'rgba(255,255,255,0.35)' }}>•</span>
                            <span>{dateStr}</span>
                          </div>
                        )}
                      </div>
                    )}
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
