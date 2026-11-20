import { AlertCircle, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEMO_ACCOUNTS: Array<{
  label: string;
  role: UserRole;
  email: string;
  password: string;
}> = [
  {
    label: 'Dr. Elena Vance (Lab Admin)',
    role: 'Lab Admin',
    email: 'admin@campus.edu',
    password: 'AdminPass123!',
  },
  {
    label: 'Maya Lin (Student)',
    role: 'Student',
    email: 'maya.lin@campus.edu',
    password: 'Student123!',
  },
  {
    label: 'Marcus Reid (Student)',
    role: 'Student',
    email: 'marcus.reid@campus.edu',
    password: 'Student123!',
  },
];

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Electrical & Computer Engineering');
  const [role, setRole] = useState<UserRole>('Student');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, department });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickSignIn(demoEmail: string, demoPassword: string) {
    setError(null);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900">
            {mode === 'login' ? 'Sign In to CampusLab Reserve' : 'Create Campus Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Segmented Mode Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Student', 'Lab Admin'] as UserRole[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRole(option)}
                        className={`py-2 px-3 text-sm font-medium border rounded-lg transition-colors cursor-pointer ${
                          role === option
                            ? 'border-blue-700 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-department"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Academic Department
                  </label>
                  <input
                    id="auth-department"
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Electrical & Computer Engineering"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1">
                Campus Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="text-xs font-medium text-slate-600">
                Pre-Seeded Campus Accounts (1-Click Sign In)
              </div>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickSignIn(acct.email, acct.password)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-slate-900">{acct.label}</span>
                    <span className="font-mono text-slate-500">{acct.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
