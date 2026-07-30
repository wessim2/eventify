'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:3000';

interface PublicEvent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface PublicOrg {
  id: string;
  name: string;
  slug: string;
  _count?: {
    events: number;
  };
}

export default function StorefrontRootPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupSlug, setLookupSlug] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const categories = ['All', 'AI & ML', 'Cloud & DevOps', 'Frontend & Web', 'Mobile & Design'];

  useEffect(() => {
    fetchGlobalData();
    const token = localStorage.getItem('eventify_user_token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('eventify_user_token');
    localStorage.removeItem('eventify_user_email');
    setIsLoggedIn(false);
  };

  const fetchGlobalData = async (searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const queryParam = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const [eventsRes, orgsRes] = await Promise.all([
        fetch(`${API_URL}/public/events${queryParam}`),
        fetch(`${API_URL}/public/organizations`),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrgs(orgsData);
      }
    } catch (err: any) {
      console.error('Failed to fetch public events', err);
      setError('Unable to load public events. Please ensure the Eventify API server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGlobalData(search);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      fetchGlobalData('');
    } else {
      fetchGlobalData(cat);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupSlug.trim()) {
      router.push(`/${lookupSlug.trim().toLowerCase()}/events`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf7', color: '#0f172a' }}>
      {/* Sticky Warm Editorial Header */}
      <header className="warm-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
            }}>
              E
            </div>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'Outfit', letterSpacing: '-0.03em', color: '#0f172a' }}>
              Eventify
            </span>
          </Link>
          <div className="warm-pill" style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0f766e', display: 'inline-block' }} />
            <span style={{ color: '#475569', fontWeight: 600 }}>Public Storefront Hub</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {isLoggedIn ? (
            <>
              <Link href="/my-tickets" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                My Tickets 🎟️
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: '0.875rem', color: '#0f172a', textDecoration: 'none', fontWeight: 600, padding: '0.5rem 0.75rem' }}>
                Log In
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Register
              </Link>
            </>
          )}
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}
          >
            Organizer Dashboard &rarr;
          </a>
        </div>
      </header>

      {/* Warm Editorial Hero Section */}
      <section style={{
        padding: '4.5rem 2.5rem 3rem 2.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div className="animate-fade-in-up" style={{ maxWidth: '850px' }}>
          <div className="warm-pill" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 1rem',
            borderRadius: '30px',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#0f766e',
          }}>
            <span>🌱 TECH EVENT OPERATING SYSTEM</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontFamily: 'Outfit',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#0f172a',
          }}>
            Discover & Book <br />
            <span style={{ color: '#0f766e' }}>
              Technology Conferences & Meetups
            </span>
          </h1>

          <p style={{ color: '#475569', fontSize: '1.15rem', marginBottom: '2.25rem', lineHeight: 1.6, maxWidth: '650px' }}>
            Explore public technology events hosted by top developer communities and organizations across the platform.
          </p>

          {/* Clean Warm Search Bar */}
          <form onSubmit={handleSearchSubmit} className="warm-card" style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            maxWidth: '680px',
            marginBottom: '1.75rem',
          }}>
            <span style={{ fontSize: '1.1rem', color: '#64748b' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by event title, tech topic, city, or community..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.95rem',
                color: '#0f172a',
                padding: '0.5rem 0',
                boxShadow: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}>
              Search Events
            </button>
          </form>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginRight: '0.5rem' }}>FILTER BY:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className="warm-pill"
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: activeCategory === cat ? '#ffffff' : '#475569',
                  backgroundColor: activeCategory === cat ? '#0f766e' : undefined,
                  borderColor: activeCategory === cat ? '#0f766e' : undefined,
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2.5rem 5rem 2.5rem' }}>
        {error && (
          <div className="warm-card" style={{
            backgroundColor: '#fee2e2',
            borderColor: '#fecaca',
            color: '#b91c1c',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            marginBottom: '2rem',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* Communities Section */}
        {orgs.length > 0 && (
          <section style={{ marginBottom: '3.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '1rem' }}>
              Active Tech Communities & Organizations
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/${org.slug}/events`}
                  className="warm-pill"
                  style={{
                    padding: '0.5rem 1.1rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{org.name}</span>
                  {org._count?.events !== undefined && (
                    <span style={{ fontSize: '0.75rem', color: '#0f766e', backgroundColor: '#f0fdf4', padding: '0.15rem 0.45rem', borderRadius: '10px', fontWeight: 600 }}>
                      {org._count.events} {org._count.events === 1 ? 'event' : 'events'}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Events Grid Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', color: '#0f172a', margin: 0 }}>
              Featured Technology Events
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Explore upcoming technology conferences, workshops & meetups
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
            {events.length} {events.length === 1 ? 'event' : 'events'} available
          </span>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '1rem' }}>
              {search ? `No published events found matching "${search}".` : 'No public events published yet.'}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Organizers can create and publish events from the{' '}
              <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" style={{ color: '#0f766e', fontWeight: 600 }}>
                Organizer Dashboard
              </a>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem' }}>
            {events.map((evt) => {
              const startDateFormatted = new Date(evt.startDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const startTimeFormatted = new Date(evt.startDate).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const prices = evt.ticketTypes?.map((t) => Number(t.price)) || [];
              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const isFree = minPrice === 0;

              return (
                <div key={evt.id} className="card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}>
                  <div>
                    {/* Header Row: Org badge + Pricing */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <Link
                        href={`/${evt.organization.slug}/events`}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#0f766e',
                          textDecoration: 'none',
                          backgroundColor: '#f0fdf4',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        {evt.organization.name}
                      </Link>

                      {minPrice !== null && (
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '16px',
                          backgroundColor: isFree ? '#ecfdf5' : '#f8fafc',
                          color: isFree ? '#047857' : '#0f172a',
                          border: isFree ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        }}>
                          {isFree ? 'Free' : `From $${minPrice}`}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.3rem', fontFamily: 'Outfit', marginTop: 0, marginBottom: '0.5rem', color: '#0f172a', lineHeight: 1.3 }}>
                      {evt.title}
                    </h3>

                    {evt.description && (
                      <p style={{
                        fontSize: '0.9rem',
                        color: '#475569',
                        marginBottom: '1.1rem',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {evt.description}
                      </p>
                    )}

                    <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                      <div>📅 <strong>{startDateFormatted}</strong> at {startTimeFormatted}</div>
                      {evt.location && <div>📍 {evt.location}</div>}
                    </div>
                  </div>

                  <Link
                    href={`/${evt.organization.slug}/events/${evt.slug}`}
                    className="btn btn-primary"
                    style={{ textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
                  >
                    Reserve Seat &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Experience Highlights Section */}
        <section style={{ marginTop: '4.5rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontFamily: 'Outfit', color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center' }}>
            Built for Seamless Attendee Experience
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.75rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>🎟️</span>
              <h4 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.4rem', margin: 0 }}>Instant Digital Pass</h4>
              <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0.4rem 0 0 0', lineHeight: 1.5 }}>
                Confirmed tickets render a digital QR code seat pass directly in your attendee portal for quick event check-in.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }}>⚡</span>
              <h4 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.4rem', margin: 0 }}>Real-Time Inventory</h4>
              <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0.4rem 0 0 0', lineHeight: 1.5 }}>
                PostgreSQL row-level locking ensures fair seat allocation without double booking or overselling.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.4rem', margin: 0 }}>🛡️</span>
              <h4 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.4rem', margin: 0 }}>Multi-Tenant Isolation</h4>
              <p style={{ color: '#475569', fontSize: '0.875rem', margin: '0.4rem 0 0 0', lineHeight: 1.5 }}>
                Each tech organization operates in an isolated environment with custom storefront URLs and dedicated management tools.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Lookup Footer Helper */}
        <section className="card" style={{ marginTop: '4rem', padding: '2rem', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0, marginBottom: '0.25rem' }}>Direct Organization Storefront Access</h4>
            <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>
              Know the exact organization slug? Enter it here to jump directly to their community storefront.
            </p>
          </div>
          <form onSubmit={handleLookupSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="e.g. gdg-tunis"
              value={lookupSlug}
              onChange={(e) => setLookupSlug(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.85rem', fontSize: '0.875rem' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Open Storefront &rarr;
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
