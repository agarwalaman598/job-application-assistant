import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const unverifiedError = error.toLowerCase().includes('verify');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (!email) { setError('Enter your email above first.'); return; }
    setError(''); setMessage(''); setResending(true);
    try {
      const res = await api.post('/auth/send-verification', { email });
      setMessage(res.data?.detail || 'Verification email sent. Check your inbox.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not resend. Please try again.');
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="animate-slide-up w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] mb-4">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">Welcome back</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Sign in to your JobAssist AI account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#f87171]">
            {error}
            {unverifiedError && (
              <button type="button" onClick={handleResend} disabled={resending}
                className="block mt-1.5 text-[var(--primary)] text-xs hover:underline disabled:opacity-50">
                {resending ? 'Sending…' : 'Resend verification email →'}
              </button>
            )}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#34d399]">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password" className="mb-0">Password</Label>
              <Link to="/forgot-password"
                className="text-[10px] font-medium text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors uppercase tracking-wide">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading} size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-[var(--muted-foreground)]">
          No account?{' '}
          <Link to="/register" className="text-[var(--primary)] font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
