'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';
import Link from 'next/link';

interface TicketRegistration {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  paymentIntentId?: string;
  createdAt: string;
  ticketType: {
    name: string;
    price: number;
    event: {
      id: string;
      title: string;
      slug: string;
      startDate: string;
      endDate: string;
      location?: string;
      status: string;
      organization: {
        id: string;
        name: string;
        slug: string;
      };
    };
  };
}

export default function AttendeeMyTicketsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<TicketRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('eventify_user_token');
    const email = localStorage.getItem('eventify_user_email');

    if (!token) {
      router.push('/login');
      return;
    }

    if (email) setUserEmail(email);

    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/public/my-registrations', 'GET');
      setRegistrations(data);
    } catch (err: any) {
      let rawMsg = err?.message || err;
      if (typeof rawMsg === 'object' && rawMsg !== null) {
        rawMsg = rawMsg.message || JSON.stringify(rawMsg);
      }
      setError(String(rawMsg || 'Failed to load your tickets. Please log in again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eventify_user_token');
    localStorage.removeItem('eventify_user_email');
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'serif', color: 'var(--text-primary)' }}>
            Eventify
          </Link>
          <span className="badge" style={{ backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: '0.7rem' }}>
            Attendee Portal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {userEmail && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Logged in as <strong>{userEmail}</strong>
            </span>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: 'serif', marginTop: 0, marginBottom: '0.5rem' }}>
              My Tickets & Registrations
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
              View your confirmed event seats, ticket QR codes, and booking history.
            </p>
          </div>
          <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            Browse More Events &rarr;
          </Link>
        </div>

        {error && (
          <div className="card" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading your tickets...
          </div>
        ) : registrations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>🎟️</span>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'serif', marginBottom: '0.5rem' }}>No Ticket Registrations Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You haven't booked any event tickets yet. Explore public tech events and reserve your seat!
            </p>
            <Link href="/" className="btn btn-primary">
              Explore Tech Events &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {registrations.map((reg) => {
              const event = reg.ticketType.event;
              const org = event.organization;

              const isConfirmed = reg.status === 'CONFIRMED';
              const isPending = reg.status === 'PENDING';
              const isFailed = reg.status === 'FAILED';

              const startDateFormatted = new Date(event.startDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const startTimeFormatted = new Date(event.startDate).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={reg.id}
                  className="card"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 240px',
                    gap: '1.5rem',
                    padding: '1.75rem',
                    borderLeft: `5px solid ${
                      isConfirmed ? '#0f766e' : isPending ? '#d97706' : '#dc2626'
                    }`,
                  }}
                >
                  {/* Left Column: Event & Ticket Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Link
                        href={`/${org.slug}/events`}
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--color-accent)',
                          textDecoration: 'none',
                          backgroundColor: 'rgba(15, 118, 110, 0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {org.name}
                      </Link>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '12px',
                          backgroundColor: isConfirmed ? '#d1fae5' : isPending ? '#fef3c7' : '#fee2e2',
                          color: isConfirmed ? '#065f46' : isPending ? '#92400e' : '#991b1b',
                        }}
                      >
                        {reg.status}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.4rem', fontFamily: 'serif', marginTop: 0, marginBottom: '0.5rem' }}>
                      {event.title}
                    </h2>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                      <div>📅 <strong>{startDateFormatted}</strong> at {startTimeFormatted}</div>
                      {event.location && <div>📍 {event.location}</div>}
                      <div>🎫 Tier: <strong>{reg.ticketType.name}</strong> (${reg.ticketType.price})</div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Booking Ref: <code>{reg.id.slice(0, 18)}...</code>
                    </div>
                  </div>

                  {/* Right Column: Digital QR Pass */}
                  <div style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--border-color)',
                  }}>
                    {isConfirmed ? (
                      <>
                        <div style={{
                          width: '90px',
                          height: '90px',
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          letterSpacing: '0.05em',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                        }}>
                          [QR CODE]
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                          Valid Seat Pass
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Show at door
                        </span>
                      </>
                    ) : isPending ? (
                      <>
                        <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏳</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>
                          Payment Pending
                        </span>
                        <Link
                          href={`/${org.slug}/checkout/${reg.id}`}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.3rem 0.6rem' }}
                        >
                          Complete Payment
                        </Link>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>❌</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>
                          Payment Failed
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Seat released
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
