import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Briefcase, FileText, TrendingUp, Award, ArrowRight, Loader2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: color + '1a' }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      {loading
        ? <div className="h-8 w-16 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
        : <p className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</p>
      }
    </Card>
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
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Good day{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Here is your application overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total"      value={stats.total}     icon={Briefcase}  color="#6366f1" loading={loading} />
        <StatCard label="Interviews" value={stats.interview} icon={TrendingUp} color="#f59e0b" loading={loading} />
        <StatCard label="Offers"     value={stats.offer}     icon={Award}      color="#10b981" loading={loading} />
        <StatCard label="Resumes"    value={stats.resumes}   icon={FileText}   color="#6366f1" loading={loading} />
      </div>

      {/* Recent applications */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Recent applications</h2>
          <Link to="/applications">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No applications yet.</p>
            <Link to="/applications">
              <Button variant="secondary" className="mt-3 text-xs" size="sm">Add your first</Button>
            </Link>
          </div>
        ) : (
          <div>
            {recent.map((app, i) => (
              <div key={app.id}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.position}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{app.company}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
