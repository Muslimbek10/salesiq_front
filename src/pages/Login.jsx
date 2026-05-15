import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Input }      from '@/components/ui/Input';
import { Button }     from '@/components/ui/Button';
import { Alert }      from '@/components/ui/Alert';
import { useAuth }    from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Login() {
  useDocumentTitle('Login');

  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from?.pathname ?? '/dashboard';

  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ username: form.username.trim(), password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your SalesIQ account
          </p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            label="Username"
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoFocus
            value={form.username}
            onChange={handleChange}
            placeholder="Enter your username"
            disabled={loading}
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            disabled={loading}
            rightIcon={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            leftIcon={!loading && <LogIn size={16} />}
            className="w-full mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Contact your administrator to reset your password.
        </p>
      </div>
    </AuthLayout>
  );
}
