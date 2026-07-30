'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

interface Org {
  id: string;
  name: string;
  slug: string;
}

export default function SelectOrgPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchOrgs = async () => {
    try {
      const data = await apiRequest('/organizations', 'GET');
      setOrgs(data);
    } catch (err: any) {
      setError('Session expired. Please log in again.');
      localStorage.removeItem('eventify_token');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('eventify_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchOrgs();
    }
  }, []);

  const handleSelect = (org: Org) => {
    localStorage.setItem('eventify_org_id', org.id);
    localStorage.setItem('eventify_org_slug', org.slug);
    localStorage.setItem('eventify_org_name', org.name);
    router.push('/dashboard');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const org = await apiRequest('/organizations', 'POST', { name: newOrgName });
      handleSelect(org);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading organizations...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Select an Organization</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Choose a workspace to manage events or create a new one.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1.25rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {orgs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem', marginBottom: '2rem' }}>
            {orgs.map((org) => (
              <div
                key={org.id}
                onClick={() => handleSelect(org)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div>
                  <span style={{ fontWeight: 6 }}>{org.name}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/{org.slug}</span>
                </div>
                <span style={{ color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 5 }}>Select &rarr;</span>
              </div>
            ))}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Create a New Organization</h3>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="orgName">Organization Name</label>
            <input
              type="text"
              id="orgName"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              required
              placeholder="e.g. Acme Conferences"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>
            {creating ? 'Creating...' : 'Create & Select'}
          </button>
        </form>
      </div>
    </div>
  );
}
