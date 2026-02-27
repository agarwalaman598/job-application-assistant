import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, FileText, Search, Wand2, LogOut, Zap
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/resumes', label: 'Resumes', icon: FileText },
  { path: '/analyze', label: 'Analyze', icon: Search },
  { path: '/autofill', label: 'Autofill', icon: Wand2 },
];

export default function Navbar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{
      background: 'rgba(17, 17, 19, 0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <Zap size={18} style={{ color: '#d4942e' }} />
          <span style={{ color: '#d4942e', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
            JobAssist
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm no-underline transition-all duration-150"
                style={{
                  color: isActive ? '#ececed' : '#5a5a63',
                  background: isActive ? 'var(--color-surface-overlay)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                }}>
                <item.icon size={15} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--color-surface-overlay)', color: '#d4942e', border: '1px solid var(--color-border)' }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <button onClick={logout}
            className="flex items-center gap-1 text-xs cursor-pointer bg-transparent border-none"
            style={{ color: '#5a5a63' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#d94f4f'}
            onMouseOut={(e) => e.currentTarget.style.color = '#5a5a63'}>
            <LogOut size={14} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
