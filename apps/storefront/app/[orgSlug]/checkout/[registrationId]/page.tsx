'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../lib/api';

interface RegistrationDetails {
  id: string;
  status: string;
  paymentIntentId: string;
  createdAt: string;
  ticketType: {
    name: string;
    price: number;
    event: {
      title: string;
    };
  };
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const registrationId = params.registrationId as string;

  const [registration, setRegistration] = useState<RegistrationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Sim States
  const [processing, setProcessing] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('Alice Smith');

  const fetchRegistrationDetails = async () => {
    try {
      const data = await apiRequest(`/storefront/registrations/${registrationId}`, 'GET', undefined, orgSlug);
      setRegistration(data);
      setPollStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'Failed to load checkout details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug && registrationId) {
      fetchRegistrationDetails();
    }
  }, [orgSlug, registrationId]);

  // Polling loop to wait for status transition
  const startPolling = async () => {
    const interval = setInterval(async () => {
      try {
        const data = await apiRequest(`/storefront/registrations/${registrationId}`, 'GET', undefined, orgSlug);
        setPollStatus(data.status);
        if (data.status !== 'PENDING') {
          clearInterval(interval);
          setProcessing(false);
          setRegistration(data);
        }
      } catch (err) {
        console.error('Error polling registration status', err);
      }
    }, 1000);
  };

  const handleSimulatePayment = async (shouldFail: boolean) => {
    if (!registration) return;
    setError('');
    setProcessing(true);

    try {
      // 1. Fire Webhook to background Queue worker
      await apiRequest('/storefront/payments/webhook', 'POST', {
        registrationId,
        paymentIntentId: registration.paymentIntentId,
        shouldFail,
      }, orgSlug);

      // 2. Start polling database status
      startPolling();
    } catch (err: any) {
      setError(err.message || 'Simulating payment failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading checkout...</p>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2>Checkout Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'This booking has expired or is invalid.'}</p>
          <button onClick={() => router.push(`/storefront/${orgSlug}/events`)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '4rem 1.5rem', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        {/* State 1: PENDING (Show checkout payment inputs) */}
        {pollStatus === 'PENDING' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Review &amp; Pay</h2>
            
            {/* Booking Details */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 6 }}>Booking Summary</span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.25rem', marginBottom: '0.25rem' }}>{registration.ticketType.event.title}</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                Ticket: {registration.ticketType.name}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '1.15rem', fontWeight: 7 }}>
                <span>Total Due:</span>
                <span style={{ color: 'var(--color-accent)' }}>${Number(registration.ticketType.price).toFixed(2)}</span>
              </div>
            </div>

            {/* Mock Credit Card Form */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 6, marginBottom: '0.75rem' }}>
                Simulated Credit Card
              </h4>
              <div className="form-group">
                <label>Cardholder Name</label>
                <input type="text" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Card Number</label>
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Expires</label>
                  <input type="text" defaultValue="12/29" required />
                </div>
                <div className="form-group">
                  <label>CVC</label>
                  <input type="text" defaultValue="123" required />
                </div>
              </div>
            </div>

            {/* Simulation Triggers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => handleSimulatePayment(false)} className="btn btn-primary" style={{ width: '100%' }}>
                Pay &amp; Confirm (Simulate Success)
              </button>
              <button onClick={() => handleSimulatePayment(true)} className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                Pay &amp; Fail (Simulate Failure)
              </button>
            </div>
          </div>
        )}

        {/* State 2: PROCESSING (Loading spinner during polling) */}
        {processing && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ border: '3px solid #e2e8f0', borderTop: '3px solid var(--color-accent)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 1.5rem auto', animation: 'spin 1s linear infinite' }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Processing Payment...</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Simulating payment gateway transaction and queue updates.
            </p>
          </div>
        )}

        {/* State 3: CONFIRMED (Success ticket screen) */}
        {pollStatus === 'CONFIRMED' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#0f766e', fontSize: '1.75rem', marginBottom: '1.25rem' }}>
                ✓
              </div>
              <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>Booking Confirmed!</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
                Your ticket has been sent to your email.
              </p>
            </div>

            {/* Ticket Card mockup */}
            <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 6 }}>Admission Pass</span>
                <h3 style={{ fontSize: '1.35rem', marginTop: '0.25rem', marginBottom: '0.25rem' }}>{registration.ticketType.event.title}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>
                  {registration.ticketType.name} — Seat: A-12
                </p>
              </div>

              {/* Mock QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#ffffff' }}>
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    {/* Clean Minimalist QR mock path */}
                    <rect x="12" y="12" width="32" height="32" fill="#0f172a" />
                    <rect x="20" y="20" width="16" height="16" fill="#ffffff" />
                    <rect x="84" y="12" width="32" height="32" fill="#0f172a" />
                    <rect x="92" y="20" width="16" height="16" fill="#ffffff" />
                    <rect x="12" y="84" width="32" height="32" fill="#0f172a" />
                    <rect x="20" y="92" width="16" height="16" fill="#ffffff" />
                    {/* Random block clusters */}
                    <rect x="60" y="28" width="12" height="12" fill="#0f172a" />
                    <rect x="68" y="44" width="12" height="24" fill="#0f172a" />
                    <rect x="28" y="60" width="24" height="12" fill="#0f172a" />
                    <rect x="84" y="60" width="12" height="12" fill="#0f172a" />
                    <rect x="60" y="84" width="24" height="12" fill="#0f172a" />
                    <rect x="84" y="84" width="12" height="24" fill="#0f172a" />
                  </svg>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Booking ID:</span>
                <code>{registration.id.substring(0, 8)}...</code>
              </div>
            </div>

            <button onClick={() => router.push(`/storefront/${orgSlug}/events`)} className="btn btn-secondary" style={{ width: '100%' }}>
              Back to storefront
            </button>
          </div>
        )}

        {/* State 4: FAILED (Failure notification screen) */}
        {pollStatus === 'FAILED' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#be123c', fontSize: '1.75rem', margin: '0 auto 0.5rem auto' }}>
              ✕
            </div>
            <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Payment Failed</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
              Your transaction failed. The reserved seat has been released back into available ticket inventory.
            </p>

            <button onClick={() => router.push(`/storefront/${orgSlug}/events`)} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Return to events list
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
