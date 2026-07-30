'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

interface Registration {
  id: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  ticketType: {
    name: string;
    price: number;
  };
}

export default function EventsManagerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Event Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Add Ticket Form Modal
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [ticketName, setTicketName] = useState('');
  const [ticketPrice, setTicketPrice] = useState('0.00');
  const [ticketCapacity, setTicketCapacity] = useState('100');
  const [addingTicket, setAddingTicket] = useState(false);

  const fetchEvents = async () => {
    try {
      const data = await apiRequest('/events', 'GET');
      setEvents(data);
      setFilteredEvents(data);
      if (data.length > 0 && !selectedEvent) {
        handleSelectEvent(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrgSlug(localStorage.getItem('eventify_org_slug') || '');
    fetchEvents();
  }, []);

  useEffect(() => {
    let result = events;
    if (statusFilter !== 'ALL') {
      result = result.filter((e) => e.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q));
    }
    setFilteredEvents(result);
  }, [events, statusFilter, searchQuery]);

  const handleSelectEvent = async (event: Event) => {
    setSelectedEvent(event);
    setTicketTypes([]);
    setRegistrations([]);
    try {
      const [ticketsData, regsData] = await Promise.all([
        apiRequest(`/events/${event.id}/ticket-types`, 'GET'),
        apiRequest(`/events/${event.id}/registrations`, 'GET'),
      ]);
      setTicketTypes(ticketsData);
      setRegistrations(regsData);
    } catch (err) {
      console.error('Failed to load event details', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const newEvent = await apiRequest('/events', 'POST', {
        title: newTitle,
        startDate: new Date(newStartDate).toISOString(),
        endDate: new Date(newEndDate).toISOString(),
      });
      setEvents((prev) => [...prev, newEvent]);
      handleSelectEvent(newEvent);
      setShowCreateModal(false);
      setNewTitle('');
      setNewStartDate('');
      setNewEndDate('');
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleAddTicketType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setError('');
    setAddingTicket(true);

    try {
      const newTicket = await apiRequest(`/events/${selectedEvent.id}/ticket-types`, 'POST', {
        name: ticketName,
        price: parseFloat(ticketPrice),
        capacity: parseInt(ticketCapacity, 10),
      });
      setTicketTypes((prev) => [...prev, newTicket]);
      setShowAddTicketModal(false);
      setTicketName('');
      setTicketPrice('0.00');
      setTicketCapacity('100');
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket tier');
    } finally {
      setAddingTicket(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedEvent) return;
    try {
      const updated = await apiRequest(`/events/${selectedEvent.id}/status`, 'PATCH', { status: newStatus });
      setSelectedEvent(updated);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err: any) {
      alert(err.message || 'Failed to transition status');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>Loading event manager...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.75rem' }}>
      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Events & Ticket Manager</h2>
          <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
            Configure tech event dates, manage ticket tiers, and track attendee rosters.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          + Create New Event
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Main Layout: Master Event List (Left) & Detail Inspector (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.75rem', flex: 1, alignItems: 'start' }}>
        
        {/* Left Pane: Master Events List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search & Filter Options */}
          <div className="card" style={{ padding: '1rem' }}>
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['ALL', 'PUBLISHED', 'DRAFT', 'COMPLETED'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: statusFilter === status ? '#0f766e' : '#ffffff',
                    color: statusFilter === status ? '#ffffff' : '#475569',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Event Cards List */}
          {filteredEvents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>No matching events found.</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="card-interactive"
                  style={{
                    padding: '1.15rem 1.25rem',
                    borderColor: isSelected ? '#0f766e' : '#e2e8f0',
                    backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                    borderLeft: isSelected ? '4px solid #0f766e' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '10px',
                        backgroundColor:
                          event.status === 'PUBLISHED'
                            ? '#d1fae5'
                            : event.status === 'DRAFT'
                            ? '#f1f5f9'
                            : '#fee2e2',
                        color:
                          event.status === 'PUBLISHED'
                            ? '#065f46'
                            : event.status === 'DRAFT'
                            ? '#475569'
                            : '#991b1b',
                      }}
                    >
                      {event.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>{event.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>/{event.slug}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Pane: Selected Event Detail Panel */}
        <div>
          {selectedEvent ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
              {/* Event Header Detail */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>{selectedEvent.title}</h2>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: selectedEvent.status === 'PUBLISHED' ? '#d1fae5' : selectedEvent.status === 'DRAFT' ? '#f1f5f9' : '#fee2e2',
                      color: selectedEvent.status === 'PUBLISHED' ? '#065f46' : selectedEvent.status === 'DRAFT' ? '#475569' : '#991b1b',
                    }}>
                      {selectedEvent.status}
                    </span>
                  </div>

                  <p style={{ color: '#475569', margin: 0, fontSize: '0.875rem' }}>
                    📅 <strong>{new Date(selectedEvent.startDate).toLocaleString()}</strong> — <strong>{new Date(selectedEvent.endDate).toLocaleString()}</strong>
                  </p>
                  <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                    URL Slug: <code>/{selectedEvent.slug}</code>
                  </p>
                </div>

                {/* Status Actions & Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Status:</label>
                    <select
                      value={selectedEvent.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      style={{ width: 'auto', padding: '0.35rem 1.25rem 0.35rem 0.65rem', fontSize: '0.85rem' }}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  {orgSlug && selectedEvent.status === 'PUBLISHED' && (
                    <a
                      href={`http://localhost:3002/${orgSlug}/events/${selectedEvent.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      View Live Event Page ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Ticket Tiers Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Ticket Tiers & Capacity</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>Configure seating capacity and prices for attendees</p>
                  </div>
                  <button onClick={() => setShowAddTicketModal(true)} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                    + Add Ticket Tier
                  </button>
                </div>

                {ticketTypes.length === 0 ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                      No ticket tiers created for this event. Add a tier to enable attendee checkout.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {ticketTypes.map((ticket) => {
                      const percentSold = ticket.capacity > 0 ? Math.min(100, Math.round((ticket.sold / ticket.capacity) * 100)) : 0;
                      return (
                        <div key={ticket.id} style={{ border: '1px solid #e2e8f0', padding: '1.15rem', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{ticket.name}</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f766e' }}>
                              ${Number(ticket.price).toFixed(2)}
                            </span>
                          </div>

                          <div style={{ margin: '0.75rem 0 0.4rem 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                              <span>Seats Allocated</span>
                              <strong>{ticket.sold} / {ticket.capacity} ({percentSold}%)</strong>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${percentSold}%`, backgroundColor: '#0f766e', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attendee Registrations Roster */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Registered Attendees</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>Real-time attendee bookings and registration statuses</p>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                    {registrations.length} Total Bookings
                  </span>
                </div>

                {registrations.length === 0 ? (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', padding: '2rem', borderRadius: '10px', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No attendee registrations recorded yet for this event.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ padding: '0.75rem 0' }}>Attendee Name</th>
                          <th style={{ padding: '0.75rem 0' }}>Tier</th>
                          <th style={{ padding: '0.75rem 0' }}>Status</th>
                          <th style={{ padding: '0.75rem 0' }}>Booked Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((reg) => (
                          <tr key={reg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.85rem 0' }}>
                              <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>
                                {reg.user.firstName} {reg.user.lastName}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{reg.user.email}</span>
                            </td>
                            <td style={{ padding: '0.85rem 0', color: '#0f172a', fontWeight: 500 }}>
                              {reg.ticketType.name} (${reg.ticketType.price})
                            </td>
                            <td style={{ padding: '0.85rem 0' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  backgroundColor:
                                    reg.status === 'CONFIRMED'
                                      ? '#d1fae5'
                                      : reg.status === 'PENDING'
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                  color:
                                    reg.status === 'CONFIRMED'
                                      ? '#065f46'
                                      : reg.status === 'PENDING'
                                      ? '#d97706'
                                      : '#991b1b',
                                }}
                              >
                                {reg.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0', color: '#64748b' }}>
                              {new Date(reg.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
              <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>Select an event from the left list to view details, configure tickets, or create a new event.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Event */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', marginTop: 0, marginBottom: '1.25rem', color: '#0f172a' }}>Create New Technology Event</h3>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="title">Event Title</label>
                <input
                  type="text"
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="e.g. AI Innovators Summit 2026"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date & Time</label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating Event...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Ticket Tier */}
      {showAddTicketModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', marginTop: 0, marginBottom: '1.25rem', color: '#0f172a' }}>Add Ticket Tier</h3>
            <form onSubmit={handleAddTicketType}>
              <div className="form-group">
                <label htmlFor="ticketName">Tier Name</label>
                <input
                  type="text"
                  id="ticketName"
                  value={ticketName}
                  onChange={(e) => setTicketName(e.target.value)}
                  required
                  placeholder="e.g. VIP Pass / General Admission"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="ticketPrice">Price ($)</label>
                  <input
                    type="number"
                    id="ticketPrice"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ticketCapacity">Seat Capacity</label>
                  <input
                    type="number"
                    id="ticketCapacity"
                    value={ticketCapacity}
                    onChange={(e) => setTicketCapacity(e.target.value)}
                    required
                    min="1"
                    step="1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAddTicketModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingTicket}>
                  {addingTicket ? 'Adding Tier...' : 'Add Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
