'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('eventify_token');
    const orgId = localStorage.getItem('eventify_org_id');

    if (!token) {
      router.push('/login');
    } else if (!orgId) {
      router.push('/select-org');
    } else {
      router.push('/dashboard');
    }
  }, []);

  return null;
}
