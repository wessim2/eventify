'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

  // Payment States
  const [processing, setProcessing] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('Alice Smith');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isFreeTicket, setIsFreeTicket] = useState(false);

  const fetchRegistrationDetails = async () => {
    try {
      const data = await apiRequest(`/storefront/registrations/${registrationId}`, 'GET', undefined, orgSlug);
      setRegistration(data);
      setPollStatus(data.status);

      if (data.status === 'PENDING') {
        // Request PaymentIntent from backend
        try {
          const intentRes = await apiRequest(
            `/storefront/checkout/${registrationId}/payment-intent`,
            'POST',
            undefined,
            orgSlug
          );
          if (intentRes.free || intentRes.status === 'CONFIRMED') {
            setIsFreeTicket(true);
            setPollStatus('CONFIRMED');
          } else {
            setClientSecret(intentRes.clientSecret);
          }
        } catch (intentErr: any) {
          console.error('Failed to create PaymentIntent', intentErr);
        }
      }
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
      // Fire Webhook trigger to background Queue worker
      await apiRequest(
        '/storefront/payments/webhook',
        'POST',
        {
          registrationId,
          paymentIntentId: registration.paymentIntentId,
          shouldFail,
        },
        orgSlug
      );

      // Start polling database status
      startPolling();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcfbf7' }}>
        <p style={{ color: '#475569' }}>Initializing secure checkout...</p>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '420px', textAlign: 'center', padding: '2.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit', marginTop: 0, color: '#0f172a' }}>Checkout Unavailable</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>{error || 'This booking has expired or is invalid.'}</p>
          <button onClick={() => router.push(`/${orgSlug}/events`)} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to Storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf7', padding: '4rem 1.5rem', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* State 1: PENDING (Show Stripe checkout payment inputs) */}
        {pollStatus === 'PENDING' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#0f766e', textTransform: 'uppercase', fontWeight: 7, letterSpacing: '0.05em' }}>
                  SECURE STRIPE CHECKOUT
                </span>
                <h2 style={{ fontSize: '1.65rem', fontFamily: 'Outfit', margin: '0.2rem 0 0 0', color: '#0f172a' }}>
                  Review &amp; Pay
                </h2>
              </div>
              <span style={{ fontSize: '1.5rem' }}>💳</span>
            </div>

            {/* Booking Details */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 6 }}>Booking Details</span>
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', marginTop: '0.25rem', marginBottom: '0.25rem', color: '#0f172a' }}>
                {registration.ticketType.event.title}
              </h3>
              <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem' }}>
                Ticket Tier: <strong>{registration.ticketType.name}</strong>
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 7, color: '#0f172a' }}>
                <span>Total Due:</span>
                <span style={{ color: '#0f766e' }}>${Number(registration.ticketType.price).toFixed(2)}</span>
              </div>
            </div>

            {/* Credit Card Form Fields */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase', fontWeight: 7, margin: 0 }}>
                  Card Payment Details
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600 }}>🔒 256-bit Encrypted</span>
              </div>

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

            {/* Submit & Simulation Triggers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => handleSimulatePayment(false)} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                Complete Checkout &amp; Confirm Ticket (${Number(registration.ticketType.price).toFixed(2)})
              </button>
              <button
                onClick={() => handleSimulatePayment(true)}
                className="btn btn-secondary"
                style={{ width: '100%', borderColor: '#fca5a5', color: '#b91c1c' }}
              >
                Simulate Payment Failure Test
              </button>
            </div>
          </div>
        )}

        {/* State 2: PROCESSING (Loading spinner during payment intent execution) */}
        {processing && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #0f766e',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              margin: '0 auto 1.5rem auto',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ fontSize: '1.3rem', fontFamily: 'Outfit', marginBottom: '0.5rem', color: '#0f172a' }}>
              Processing Payment...
            </h3>
            <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem' }}>
              Executing Stripe transaction and allocating confirmed event seat.
            </p>
          </div>
        )}

        {/* State 3: CONFIRMED (Success digital QR ticket pass) */}
        {pollStatus === 'CONFIRMED' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#0f766e',
                fontSize: '2rem',
                marginBottom: '1rem',
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '1.85rem', fontFamily: 'Outfit', margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                Booking Confirmed!
              </h2>
              <p style={{ color: '#475569', margin: 0, fontSize: '0.95rem' }}>
                {isFreeTicket ? 'Free admission ticket confirmed.' : 'Payment processed successfully via Stripe.'}
              </p>
            </div>

            {/* Digital Ticket Pass Card */}
            <div style={{
              border: '1px dashed #0f766e',
              borderRadius: '12px',
              padding: '1.75rem',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#0f766e', textTransform: 'uppercase', fontWeight: 7, letterSpacing: '0.05em' }}>
                  DIGITAL ADMISSION PASS
                </span>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', marginTop: '0.25rem', marginBottom: '0.25rem', color: '#0f172a' }}>
                  {registration.ticketType.event.title}
                </h3>
                <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem' }}>
                  Tier: <strong>{registration.ticketType.name}</strong> — Reserved Seat
                </p>
              </div>

              {/* Digital QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                <div style={{ border: '1px solid #cbd5e1', padding: '0.85rem', borderRadius: '10px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <svg width="128" height="128" viewBox="0 0 128 128">
                    <rect x="12" y="12" width="32" height="32" fill="#0f172a" />
                    <rect x="20" y="20" width="16" height="16" fill="#ffffff" />
                    <rect x="84" y="12" width="32" height="32" fill="#0f172a" />
                    <rect x="92" y="20" width="16" height="16" fill="#ffffff" />
                    <rect x="12" y="84" width="32" height="32" fill="#0f172a" />
                    <rect x="20" y="92" width="16" height="16" fill="#ffffff" />
                    <rect x="60" y="28" width="12" height="12" fill="#0f172a" />
                    <rect x="68" y="44" width="12" height="24" fill="#0f172a" />
                    <rect x="28" y="60" width="24" height="12" fill="#0f172a" />
                    <rect x="84" y="60" width="12" height="12" fill="#0f172a" />
                    <rect x="60" y="84" width="24" height="12" fill="#0f172a" />
                    <rect x="84" y="84" width="12" height="24" fill="#0f172a" />
                  </svg>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                <span>Booking ID:</span>
                <code>{registration.id.substring(0, 8)}...</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/my-tickets" className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                View in My Tickets 🎟️
              </Link>
              <Link href={`/${orgSlug}/events`} className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                Back to Storefront
              </Link>
            </div>
          </div>
        )}

        {/* State 4: FAILED (Failure screen) */}
        {pollStatus === 'FAILED' && !processing && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '2rem',
              margin: '0 auto 0.5rem auto'
            }}>
              ✕
            </div>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>
              Payment Failed
            </h2>
            <p style={{ color: '#475569', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
              Your transaction failed. The reserved seat has been released back into available inventory.
            </p>

            <Link href={`/${orgSlug}/events`} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center' }}>
              Return to Events List
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
