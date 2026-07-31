'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '../../../../lib/api';

interface Registration {
  id: string;
  status: string;
  checkedInAt?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  ticketType: {
    name: string;
    price: number;
  };
}

interface Stats {
  totalRegistrations: number;
  checkedInCount: number;
  percentCheckedIn: number;
}

export default function CheckInPortalPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);

  const fetchData = async () => {
    try {
      const [eventData, regsData, statsData] = await Promise.all([
        apiRequest(`/events/${eventId}`, 'GET'),
        apiRequest(`/events/${eventId}/registrations`, 'GET'),
        apiRequest(`/events/${eventId}/check-in/stats`, 'GET'),
      ]);
      setEventTitle(eventData.title);
      setRegistrations(regsData.filter((r: Registration) => r.status === 'CONFIRMED'));
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load check-in portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const handleCheckIn = async (registrationId: string) => {
    setError('');
    setSuccessMsg('');
    setScanning(true);

    try {
      const res = await apiRequest(`/events/${eventId}/check-in/${registrationId}`, 'POST');
      setSuccessMsg(`Checked in ${res.registration.user.firstName} ${res.registration.user.lastName} (${res.registration.ticketType.name})`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Check-in failed');
    } finally {
      setScanning(false);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    // Search by exact registration ID or email
    const match = registrations.find(
      (r) => r.id.toLowerCase() === search.trim().toLowerCase() || r.user.email.toLowerCase() === search.trim().toLowerCase()
    );

    if (match) {
      handleCheckIn(match.id);
      setSearch('');
    } else {
      setError(`No confirmed booking found for "${search}". Please verify registration ID or attendee email.`);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.user.firstName.toLowerCase().includes(q) ||
      r.user.lastName.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>Loading event check-in portal...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Bar Navigation & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/dashboard/events" style={{ fontSize: '0.85rem', color: '#0f766e', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: '0.4rem' }}>
            &larr; Back to Events Manager
          </Link>
          <h2 style={{ fontSize: '1.85rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>
            Event Day Check-in Portal
          </h2>
          <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
            Event: <strong>{eventTitle}</strong>
          </p>
        </div>

        {/* Real-time Check-in Counter */}
        {stats && (
          <div className="card" style={{ padding: '1rem 1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '1.8rem' }}>🎟️</div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 7, textTransform: 'uppercase' }}>Check-in Progress</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 7, color: '#0f172a', margin: '0.1rem 0' }}>
                  {stats.checkedInCount} / {stats.totalRegistrations} Attendees ({stats.percentCheckedIn}%)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="card" style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#b91c1c', padding: '1rem 1.25rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ backgroundColor: '#d1fae5', borderColor: '#a7f3d0', color: '#065f46', padding: '1rem 1.25rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Manual Search & Scanner Input Bar */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontFamily: 'Outfit', marginTop: 0, marginBottom: '0.75rem', color: '#0f172a' }}>
          Scan QR Code or Search Attendee
        </h3>
        <form onSubmit={handleManualCodeSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: '650px' }}>
          <input
            type="text"
            placeholder="Scan QR code, enter registration ID, or attendee email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.95rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={scanning}>
            {scanning ? 'Checking In...' : 'Instant Check-in'}
          </button>
        </form>
      </div>

      {/* Attendee Roster Table */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Confirmed Attendee Roster</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {filteredRegistrations.length} Confirmed Seats
          </span>
        </div>

        {filteredRegistrations.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, textAlign: 'center', padding: '2rem 0' }}>
            No confirmed attendees match your search criteria.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 0' }}>Attendee Name</th>
                  <th style={{ padding: '0.75rem 0' }}>Ticket Tier</th>
                  <th style={{ padding: '0.75rem 0' }}>Check-in Status</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg) => {
                  const isCheckedIn = !!reg.checkedInAt;
                  const timeFormatted = reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <tr key={reg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>
                          {reg.user.firstName} {reg.user.lastName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{reg.user.email}</span>
                      </td>
                      <td style={{ padding: '1rem 0', color: '#0f172a', fontWeight: 500 }}>
                        {reg.ticketType.name}
                      </td>
                      <td style={{ padding: '1rem 0' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isCheckedIn ? '#d1fae5' : '#f1f5f9',
                            color: isCheckedIn ? '#065f46' : '#475569',
                          }}
                        >
                          {isCheckedIn ? `✓ Checked In (${timeFormatted})` : 'Not Checked In'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                        {isCheckedIn ? (
                          <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>Already Admitted</span>
                        ) : (
                          <button
                            onClick={() => handleCheckIn(reg.id)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                            disabled={scanning}
                          >
                            Check In Attendee &rarr;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
