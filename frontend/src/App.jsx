import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { NavigationGuardProvider } from './context/NavigationGuardContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ResumePage from './pages/ResumePage';
import AnalyzePage from './pages/AnalyzePage';
import AutofillPage from './pages/AutofillPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ApplicationsPage from './pages/ApplicationsPage';
import './index.css';

function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={`flex flex-col flex-1 min-h-screen overflow-auto transition-all duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}
      >
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 h-14 px-4 border-b sticky top-0 z-20"
          style={{ background: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--foreground)]">JobAssist AI</span>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <NavigationGuardProvider>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/register"       element={<RegisterPage />} />
          <Route path="/verify-email"   element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes with sidebar layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/applications" element={
            <ProtectedRoute><AppLayout><ApplicationsPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/resumes" element={
            <ProtectedRoute><AppLayout><ResumePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/analyze" element={
            <ProtectedRoute><AppLayout><AnalyzePage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/autofill" element={
            <ProtectedRoute><AppLayout><AutofillPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
        </NavigationGuardProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
