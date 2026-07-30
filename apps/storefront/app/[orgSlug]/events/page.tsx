'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
}

export default function StorefrontEventsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await apiRequest('/storefront/events', 'GET', undefined, orgSlug);
        setEvents(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load events for this organization');
      } finally {
        setLoading(false);
      }
    };
    if (orgSlug) fetchEvents();
  }, [orgSlug]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading event list...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '3rem 1.5rem', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 6, textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
            Event storefront
          </span>
          <h1 style={{ fontSize: '2.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            {orgSlug.charAt(0).toUpperCase() + orgSlug.slice(1)} Events
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Discover and register for technology conferences, meetups, and workshops.
          </p>
        </header>

        {error && (
          <div className="card" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontWeight: 5 }}>Error</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        {/* Events List */}
        {events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No published events found for this organization.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {events.map((event) => (
              <div key={event.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📅 {new Date(event.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <h2 style={{ fontSize: '1.75rem', marginTop: '0.375rem', marginBottom: '0.5rem' }}>{event.title}</h2>
                  {event.location && (
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block' }}>
                      📍 {event.location}
                    </span>
                  )}
                </div>

                {event.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                    {event.description}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                  <Link href={`/storefront/${orgSlug}/events/${event.slug}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                    View Tickets &amp; Book &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
