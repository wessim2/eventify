'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../lib/api';

interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  ticketTypes: TicketType[];
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const eventSlug = params.eventSlug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Selected Ticket Tier State
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Inline Auth Widget States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const fetchEventDetails = async () => {
    try {
      const data = await apiRequest(`/storefront/events/${eventSlug}`, 'GET', undefined, orgSlug);
      setEvent(data);
      if (data.ticketTypes && data.ticketTypes.length > 0) {
        setSelectedTicketId(data.ticketTypes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug && eventSlug) fetchEventDetails();
  }, [orgSlug, eventSlug]);

  const handleBookingSubmit = async () => {
    const token = localStorage.getItem('eventify_user_token');
    if (!token) {
      // Prompt inline auth modal
      setShowAuthModal(true);
      return;
    }

    if (!selectedTicketId || !event) return;
    setBookingError('');
    setBookingLoading(true);

    try {
      const response = await apiRequest(`/storefront/events/${event.id}/register`, 'POST', {
        ticketTypeId: selectedTicketId,
        quantity: 1,
      }, orgSlug);

      // Redirect to simulated checkout page
      router.push(`/storefront/${orgSlug}/checkout/${response.registrationId}`);
    } catch (err: any) {
      setBookingError(err.message || 'Booking allocation failed. Tickets might be sold out.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // Client validation
    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!authPassword) {
      setAuthError('Please enter your password.');
      return;
    }
    if (!isLoginTab) {
      if (!authFirstName.trim()) {
        setAuthError('Please enter your first name.');
        return;
      }
      if (!authLastName.trim()) {
        setAuthError('Please enter your last name.');
        return;
      }
      if (authPassword.length < 8) {
        setAuthError('Password must be at least 8 characters long.');
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (isLoginTab) {
        // Authenticate User
        const res = await apiRequest('/auth/login', 'POST', {
          email: trimmedEmail,
          password: authPassword,
        });
        localStorage.setItem('eventify_user_token', res.accessToken);
      } else {
        // Register User
        await apiRequest('/auth/register', 'POST', {
          email: trimmedEmail,
          password: authPassword,
          firstName: authFirstName.trim(),
          lastName: authLastName.trim(),
        });
        // Auto Login after Registration
        const res = await apiRequest('/auth/login', 'POST', {
          email: trimmedEmail,
          password: authPassword,
        });
        localStorage.setItem('eventify_user_token', res.accessToken);
      }

      setShowAuthModal(false);
      // Resume booking flow
      handleBookingSubmit();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2>Event Not Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'This event is unavailable or draft only.'}</p>
          <button onClick={() => router.push(`/storefront/${orgSlug}/events`)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '3rem 1.5rem', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back Link */}
        <button
          onClick={() => router.push(`/storefront/${orgSlug}/events`)}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '2rem', fontFamily: 'var(--font-sans)', fontWeight: 5 }}
        >
          &larr; Back to event list
        </button>

        {/* Hero Title */}
        <header style={{ marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            📅 {new Date(event.startDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
          </span>
          <h1 style={{ fontSize: '2.5rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>{event.title}</h1>
          {event.location && (
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
              📍 {event.location}
            </p>
          )}
        </header>

        {/* Grid layout: Left Details, Right Checkout Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2.5rem' }}>
          {/* Details */}
          <div>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              About the Event
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {event.description || 'No description provided by the host.'}
            </p>
          </div>

          {/* Checkout Selection Card */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '1.25rem' }}>Register Tickets</h3>

              {bookingError && (
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {bookingError}
                </div>
              )}

              {event.ticketTypes.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>This event does not have any tickets configured yet.</p>
              ) : (
                <div>
                  <div className="form-group">
                    <label htmlFor="ticketTier">Select Ticket Tier</label>
                    <select
                      id="ticketTier"
                      value={selectedTicketId}
                      onChange={(e) => setSelectedTicketId(e.target.value)}
                    >
                      {event.ticketTypes.map((t) => (
                        <option key={t.id} value={t.id} disabled={t.sold >= t.capacity}>
                          {t.name} — ${Number(t.price).toFixed(2)} {t.sold >= t.capacity ? '(Sold Out)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleBookingSubmit}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Reserving...' : 'Book 1 Ticket'}
                  </button>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
                    Note: Tickets are reserved temporarily pending payment confirmation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Authentication Widget Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setIsLoginTab(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isLoginTab ? '2px solid var(--color-accent)' : 'none',
                  padding: '0.75rem',
                  fontWeight: isLoginTab ? 6 : 4,
                  color: isLoginTab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Log In
              </button>
              <button
                onClick={() => setIsLoginTab(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: !isLoginTab ? '2px solid var(--color-accent)' : 'none',
                  padding: '0.75rem',
                  fontWeight: !isLoginTab ? 6 : 4,
                  color: !isLoginTab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                padding: '0.75rem 0.875rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                lineHeight: 1.4,
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                <span style={{ flex: 1 }}>{authError}</span>
                <button
                  type="button"
                  onClick={() => setAuthError('')}
                  style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {!isLoginTab && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={authFirstName}
                      onChange={(e) => setAuthFirstName(e.target.value)}
                      required
                      placeholder="Alice"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={authLastName}
                      onChange={(e) => setAuthLastName(e.target.value)}
                      required
                      placeholder="Smith"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="authEmail">Email Address</label>
                <input
                  type="email"
                  id="authEmail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="authPassword">Password</label>
                <input
                  type="password"
                  id="authPassword"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAuthModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={authLoading}>
                  {authLoading ? 'Verifying...' : isLoginTab ? 'Log In' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
