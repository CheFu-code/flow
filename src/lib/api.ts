export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function flowHeaders() {
  const apiKey = process.env.NEXT_PUBLIC_FLOW_API_KEY;

  return {
    ...(apiKey ? { 'x-flow-api-key': apiKey } : {}),
  };
}

