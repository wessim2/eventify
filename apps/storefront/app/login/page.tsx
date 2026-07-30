'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import Link from 'next/link';

export default function AttendeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', 'POST', { email: trimmedEmail, password });
      localStorage.setItem('eventify_user_token', data.accessToken);
      localStorage.setItem('eventify_user_email', trimmedEmail);
      router.push('/my-tickets');
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
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'serif', color: 'var(--text-primary)' }}>
          Eventify
        </Link>
        <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          &larr; Back to Events Hub
        </Link>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '0.5rem', fontFamily: 'serif' }}>
            Attendee Log In
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Access your event tickets and registrations
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
            <Link href="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 6 }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
