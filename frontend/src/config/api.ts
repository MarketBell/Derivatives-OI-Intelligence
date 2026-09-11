/**
 * Centralized API Base URL configuration.
 * In production: uses import.meta.env.VITE_API_BASE_URL (or falls back to relative path '' if served behind reverse proxy / same domain).
 * In development: defaults to 'http://localhost:5000' when VITE_API_BASE_URL is absent.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

/**
 * One-time registration fee (INR) and the Razorpay payment link users open to
 * pay it. Override the link with VITE_RAZORPAY_REGISTRATION_LINK if it changes.
 */
export const REGISTRATION_FEE_INR = 499;
export const REGISTRATION_PAYMENT_LINK: string =
  (import.meta.env.VITE_RAZORPAY_REGISTRATION_LINK as string | undefined) ||
  'https://rzp.io/rzp/5ron1XC4';
