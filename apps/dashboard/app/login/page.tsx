'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address (e.g. name@company.com).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate user
      const data = await apiRequest('/auth/login', 'POST', { email: trimmedEmail, password });
      localStorage.setItem('eventify_token', data.accessToken);

      // 2. Fetch memberships to determine destination
      let orgs = [];
      try {
        orgs = await apiRequest('/organizations', 'GET');
      } catch (orgErr: any) {
        // If organization list fetch fails, fall back safely to select-org
        console.warn('Failed to fetch orgs after login', orgErr);
        router.push('/select-org');
        return;
      }

      if (!orgs || orgs.length === 0) {
        // Redirect to org selection page to create an org
        router.push('/select-org');
      } else {
        // Select the first org by default and redirect to dashboard
        localStorage.setItem('eventify_org_id', orgs[0].id);
        localStorage.setItem('eventify_org_slug', orgs[0].slug);
        localStorage.setItem('eventify_org_name', orgs[0].name);
        router.push('/dashboard');
      }
    } catch (err: any) {
      let rawMsg = err?.message || err;
      if (typeof rawMsg === 'object' && rawMsg !== null) {
        rawMsg = rawMsg.message || JSON.stringify(rawMsg);
      }
      let finalMsg = String(rawMsg || '').trim();
      if (!finalMsg || finalMsg === '[object Object]') {
        finalMsg = 'Invalid email or password. Please try again.';
      }
      setError(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '0.5rem' }}>Log In to Eventify</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Organizer Control Plane
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            lineHeight: 1.4,
          }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="name@company.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1.5rem', marginBottom: 0 }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 5 }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
