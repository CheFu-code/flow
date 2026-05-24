export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.chefuinc.com';

export function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function flowHeaders() {
  const apiKey = process.env.NEXT_PUBLIC_FLOW_API_KEY;

  return {
    ...(apiKey ? { 'x-flow-api-key': apiKey } : {}),
  };
}

