/**
 * Centralized API Base URL configuration.
 * In production: uses import.meta.env.VITE_API_BASE_URL (or falls back to relative path '' if served behind reverse proxy / same domain).
 * In development: defaults to 'http://localhost:5000' when VITE_API_BASE_URL is absent.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '');
