'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('eventify_token');
    const orgId = localStorage.getItem('eventify_org_id');
    const name = localStorage.getItem('eventify_org_name');
    const slug = localStorage.getItem('eventify_org_slug');

    if (!token) {
      router.push('/login');
    } else if (!orgId) {
      router.push('/select-org');
    } else {
      setOrgName(name || 'Organization');
      setOrgSlug(slug || '');
      setLoading(false);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('eventify_token');
    localStorage.removeItem('eventify_org_id');
    localStorage.removeItem('eventify_org_slug');
    localStorage.removeItem('eventify_org_name');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfbf7' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⌛</div>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>Loading Organizer Hub...</p>
        </div>
      </div>
    );
  }

  const getNavStyle = (path: string, exact = false) => {
    const active = exact ? pathname === path : pathname.startsWith(path);
    return {
      padding: '0.6rem 0.85rem',
      borderRadius: '8px',
      textDecoration: 'none',
      color: active ? '#0f766e' : '#0f172a',
      backgroundColor: active ? '#f0fdf4' : 'transparent',
      fontWeight: active ? 600 : 500,
      fontSize: '0.9rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      transition: 'all 0.15s ease',
    };
  };

  // Determine current page title
  const pageTitle = pathname === '/dashboard'
    ? 'Overview & Metrics'
    : pathname.startsWith('/dashboard/events')
    ? 'Events & Ticket Management'
    : pathname === '/dashboard/members'
    ? 'Team & Collaborators'
    : 'Organizer Control Plane';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#fcfbf7' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1.25rem',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Brand & Active Workspace */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1rem',
            }}>
              E
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Outfit', letterSpacing: '-0.02em', color: '#0f172a' }}>
              Eventify
            </span>
          </div>

          {/* Org Selector Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.75rem',
          }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 7, letterSpacing: '0.05em' }}>
              ACTIVE ORGANIZER WORKSPACE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                {orgName}
              </span>
              <Link href="/select-org" style={{ fontSize: '0.75rem', color: '#0f766e', textDecoration: 'none', fontWeight: 600 }}>
                Switch
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <Link href="/dashboard" style={getNavStyle('/dashboard', true)}>
            <span>📊</span> Overview
          </Link>
          <Link href="/dashboard/events" style={getNavStyle('/dashboard/events')}>
            <span>📅</span> Events Manager
          </Link>
          <Link href="/dashboard/members" style={getNavStyle('/dashboard/members')}>
            <span>👥</span> Team & Members
          </Link>

          {orgSlug && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 7, letterSpacing: '0.05em', paddingLeft: '0.5rem', display: 'block', marginBottom: '0.5rem' }}>
                PUBLIC STOREFRONT
              </span>
              <a
                href={`http://localhost:3002/${orgSlug}/events`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#0f766e',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>View Storefront</span>
                <span>↗</span>
              </a>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 0.75rem', justifyContent: 'center' }}>
            <span>🔒</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1.25rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>
              {pageTitle}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="warm-pill" style={{ padding: '0.35rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#0f766e', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              Tenant: {orgName}
            </span>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', boxSizing: 'border-box' }} className="animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
