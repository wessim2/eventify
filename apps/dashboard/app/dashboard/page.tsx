'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function DashboardHomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  const [stripeStatus, setStripeStatus] = useState<{ isConnected: boolean; stripeAccountId?: string; subscriptionTier?: string } | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    const orgId = localStorage.getItem('eventify_org_id');
    setOrgName(localStorage.getItem('eventify_org_name') || 'Organization');
    setOrgSlug(localStorage.getItem('eventify_org_slug') || '');
    
    const fetchStats = async () => {
      try {
        const [eventsData, stripeData] = await Promise.all([
          apiRequest('/events', 'GET'),
          orgId ? apiRequest(`/organizations/${orgId}/stripe/status`, 'GET') : Promise.resolve(null),
        ]);
        setEvents(eventsData);
        if (stripeData) setStripeStatus(stripeData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleConnectStripe = async () => {
    const orgId = localStorage.getItem('eventify_org_id');
    if (!orgId) return;
    setConnectingStripe(true);
    try {
      const res = await apiRequest(`/organizations/${orgId}/stripe/connect`, 'POST');
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Stripe Connect onboarding');
    } finally {
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
        Loading workspace overview...
      </div>
    );
  }

  const publishedEvents = events.filter((e) => e.status === 'PUBLISHED');
  const draftEvents = events.filter((e) => e.status === 'DRAFT');
  const completedEvents = events.filter((e) => e.status === 'COMPLETED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Welcome Banner */}
      <div className="card" style={{
        padding: '2rem 2.25rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.05em' }}>
            CONTROL PLANE DASHBOARD
          </span>
          <h2 style={{ fontSize: '1.85rem', fontFamily: 'Outfit', marginTop: '0.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            Welcome back to {orgName}
          </h2>
          <p style={{ color: '#475569', margin: 0, fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.5 }}>
            Manage your technology conferences, ticket tiers, team collaborators, and event day operations in one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/events" className="btn btn-primary">
            + Create New Event
          </Link>
          {orgSlug && (
            <a
              href={`http://localhost:3002/${orgSlug}/events`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Public Storefront ↗
            </a>
          )}
        </div>
      </div>

      {/* Stripe Connect Integration Status Banner */}
      <div className="card" style={{
        padding: '1.5rem 1.75rem',
        backgroundColor: stripeStatus?.isConnected ? '#f0fdf4' : '#fffbe6',
        border: stripeStatus?.isConnected ? '1px solid #bbf7d0' : '1px solid #ffe58f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: stripeStatus?.isConnected ? '#0f766e' : '#d97706',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
          }}>
            💳
          </div>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>
              {stripeStatus?.isConnected ? 'Stripe Account Connected' : 'Connect Stripe to Receive Ticket Sales Payouts'}
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
              {stripeStatus?.isConnected
                ? `Account Connected (${stripeStatus.stripeAccountId}). You can publish paid ticket tiers.`
                : 'Connect your Stripe account to enable paid ticket sales and direct automatic bank deposits.'}
            </p>
          </div>
        </div>

        {!stripeStatus?.isConnected && (
          <button
            onClick={handleConnectStripe}
            disabled={connectingStripe}
            className="btn btn-primary"
            style={{ backgroundColor: '#6366f1', borderColor: '#4f46e5' }}
          >
            {connectingStripe ? 'Connecting to Stripe...' : 'Connect Stripe Account 💳'}
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>TOTAL EVENTS</span>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
          </div>
          <span style={{ display: 'block', fontSize: '2.25rem', fontFamily: 'Outfit', fontWeight: 700, marginTop: '0.5rem', color: '#0f172a' }}>
            {events.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            All active & archived events
          </span>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #0f766e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>PUBLISHED EVENTS</span>
            <span style={{ fontSize: '1.25rem' }}>🟢</span>
          </div>
          <span style={{ display: 'block', fontSize: '2.25rem', fontFamily: 'Outfit', fontWeight: 700, marginTop: '0.5rem', color: '#0f766e' }}>
            {publishedEvents.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '0.25rem', display: 'block' }}>
            Live on public storefront
          </span>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>DRAFT EVENTS</span>
            <span style={{ fontSize: '1.25rem' }}>📝</span>
          </div>
          <span style={{ display: 'block', fontSize: '2.25rem', fontFamily: 'Outfit', fontWeight: 700, marginTop: '0.5rem', color: '#d97706' }}>
            {draftEvents.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            Pending publish setup
          </span>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>COMPLETED</span>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
          </div>
          <span style={{ display: 'block', fontSize: '2.25rem', fontFamily: 'Outfit', fontWeight: 700, marginTop: '0.5rem', color: '#0f172a' }}>
            {completedEvents.length}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            Concluded tech events
          </span>
        </div>
      </div>

      {/* Overview Table: Recent Events */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Recent Events</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>Overview of events in your active organization</p>
          </div>
          <Link href="/dashboard/events" style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}>
            View All Events &rarr;
          </Link>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <p style={{ margin: 0 }}>No events created yet.</p>
            <Link href="/dashboard/events" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create Your First Event
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '0.75rem 0' }}>Event Title</th>
                <th style={{ padding: '0.75rem 0' }}>Status</th>
                <th style={{ padding: '0.75rem 0' }}>Start Date</th>
                <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 5).map((evt) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.85rem 0' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>{evt.title}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{evt.slug}</span>
                  </td>
                  <td style={{ padding: '0.85rem 0' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      backgroundColor: evt.status === 'PUBLISHED' ? '#d1fae5' : evt.status === 'DRAFT' ? '#f1f5f9' : '#fee2e2',
                      color: evt.status === 'PUBLISHED' ? '#065f46' : evt.status === 'DRAFT' ? '#475569' : '#991b1b',
                    }}>
                      {evt.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0', color: '#475569' }}>
                    {new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.85rem 0', textAlign: 'right' }}>
                    <Link href="/dashboard/events" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                      Manage &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Action Cards */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', marginBottom: '1.25rem', color: '#0f172a' }}>Quick Management Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <Link href="/dashboard/events" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-interactive" style={{ height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</div>
              <h4 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', margin: '0 0 0.4rem 0', color: '#0f766e' }}>Event & Ticket Setup</h4>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                Configure event dates, ticket tiers, pricing caps, and view attendee registration rosters.
              </p>
            </div>
          </Link>

          <Link href="/dashboard/members" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-interactive" style={{ height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
              <h4 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', margin: '0 0 0.4rem 0', color: '#0f766e' }}>Collaborators & Roles</h4>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                Invite team members, assign RBAC permissions (Owner, Admin, Member), and manage workspace access.
              </p>
            </div>
          </Link>

          <a href={`http://localhost:3002/${orgSlug}/events`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-interactive" style={{ height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌐</div>
              <h4 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', margin: '0 0 0.4rem 0', color: '#0f766e' }}>Public Storefront ↗</h4>
              <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                Preview your organization's public event storefront as attendees see it.
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
