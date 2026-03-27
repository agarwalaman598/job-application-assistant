import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useNavigationGuard } from '../context/NavigationGuardContext';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  User,
  ScanSearch,
  Wand2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard },
  { label: 'Applications', href: '/applications',  icon: Briefcase },
  { label: 'Contacts',     href: '/contacts',      icon: Users },
  { label: 'Resumes',      href: '/resumes',       icon: FileText },
  { label: 'Analyze',      href: '/analyze',       icon: ScanSearch },
  { label: 'Autofill',     href: '/autofill',      icon: Wand2 },
  { label: 'Profile',      href: '/profile',       icon: User },
];

/**
 * Props:
 *  collapsed  – desktop icon-only mode
 *  onToggle   – toggle collapsed (desktop)
 *  mobileOpen – mobile overlay visible
 *  onClose    – close mobile overlay
 */
export function Sidebar({ collapsed = false, onToggle, mobileOpen = false, onClose }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { logout, user } = useAuth();
  const { requestNavigate } = useNavigationGuard() ?? {};
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const startedAt = Date.now();
    try {
      await logout();
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      navigate('/login');
    } finally {
      setSigningOut(false);
    }
  }

  const w = collapsed ? 'w-16' : 'w-64';

  const sidebarContent = (
    <aside
      className={cn('fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-200', w)}
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo row */}
      {collapsed ? (
        /* Collapsed: stack logo and toggle vertically */
        <div className="flex flex-col items-center border-b border-[var(--sidebar-border)] shrink-0 py-2 gap-1">
          <div className="flex h-9 w-9 items-center justify-center shrink-0">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="#232323"/>
              <path d="M14 16V14.8C14 13.53 15.03 12.5 16.3 12.5H23.7C24.97 12.5 26 13.53 26 14.8V16"
                    stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <rect x="9" y="16" width="22" height="14" rx="3.5"
                    stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              title="Expand sidebar"
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        /* Expanded: logo + name + toggle in a row */
        <div className="flex h-16 items-center gap-3 px-4 border-b border-[var(--sidebar-border)] shrink-0">
          <div className="flex h-9 w-9 items-center justify-center shrink-0">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="#232323"/>
              <path d="M14 16V14.8C14 13.53 15.03 12.5 16.3 12.5H23.7C24.97 12.5 26 13.53 26 14.8V16"
                    stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <rect x="9" y="16" width="22" height="14" rx="3.5"
                    stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--sidebar-foreground)] truncate">JobAssist AI</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Tracker</p>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close menu"
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = location.pathname === href || location.pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              to={href}
              onClick={(e) => {
                // Same page — nothing to block
                if (location.pathname === href) { onClose?.(); return; }
                const blocked = requestNavigate?.(href, navigate);
                if (blocked) {
                  e.preventDefault();
                } else {
                  onClose?.();
                }
              }}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 select-none',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                active
                  ? 'text-[var(--primary)] bg-[rgba(99,102,241,0.08)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && active && (
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-[var(--sidebar-border)] py-3', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && user?.email && (
          <p className="px-3 pb-2 text-[11px] text-[var(--muted-foreground)] truncate">{user.email}</p>
        )}
        <button
          onClick={() => setConfirming(true)}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center rounded-lg text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150 py-2.5',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ) : 'Sign out'}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Sign-out confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.75rem', width: '100%', maxWidth: '340px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>Sign out?</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Are you sure you want to sign out of your account?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setConfirming(false)}
                disabled={signingOut}
                style={{
                  flex: 1, padding: '9px', borderRadius: '9999px', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'inherit',
                  background: 'var(--input)', color: 'var(--foreground)', border: '1px solid var(--border)',
                  cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.65 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={signingOut}
                style={{
                  flex: 1, padding: '9px', borderRadius: '9999px', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit',
                  background: '#1f1f1f', color: 'var(--foreground)', border: '1px solid #2e2e2e',
                  cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.85 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Signing out…
                  </>
                ) : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />
          <div className="md:hidden">{sidebarContent}</div>
        </>
      )}
    </>
  );
}
