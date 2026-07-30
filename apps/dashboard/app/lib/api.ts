const API_URL = 'http://localhost:3000';

/**
 * Shared client API helper for Dashboard.
 * Automatically appends Authorization and X-Organization-Id headers from localStorage.
 */
export async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  headers: Record<string, string> = {},
) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('eventify_token') : null;
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('eventify_org_id') : null;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (orgId) {
    defaultHeaders['X-Organization-Id'] = orgId;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    throw new Error('Unable to connect to the Eventify backend server. Please ensure the backend is running.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.message || errorData.error;

    if (Array.isArray(msg)) {
      msg = msg.join('. ');
    } else if (typeof msg === 'object' && msg !== null) {
      msg = msg.message || JSON.stringify(msg);
    }

    if (typeof msg !== 'string' || !msg || msg === '[object Object]') {
      if (response.status === 401) {
        msg = 'Invalid email or password. Please check your credentials and try again.';
      } else if (response.status === 403) {
        msg = 'Access denied. You do not have permission for this action.';
      } else if (response.status === 404) {
        msg = 'The requested resource was not found.';
      } else if (response.status === 409) {
        msg = 'An account or organization with this detail already exists.';
      } else if (response.status >= 500) {
        msg = 'A server error occurred. Please try again later.';
      } else {
        msg = `Request failed with status ${response.status}`;
      }
    }

    throw new Error(msg);
  }

  return response.json();
}
