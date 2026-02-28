import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Applications', href: '/applications',  icon: Briefcase },
  { label: 'Resumes',      href: '/resumes',       icon: FileText },
  { label: 'Profile',      href: '/profile',       icon: User },
];

export function Sidebar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-[var(--sidebar-border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-[var(--sidebar-foreground)]">JobAssist&nbsp;AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = location.pathname === href || location.pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none',
                active
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] px-3 py-3 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-7 w-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white">
              {(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--sidebar-foreground)] truncate">
                {user.full_name || user.email}
              </p>
              {user.full_name && (
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
              )}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[rgba(239,68,68,0.06)] transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
