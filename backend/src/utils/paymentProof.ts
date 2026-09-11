/**
 * Validation for uploaded registration-fee payment proofs.
 * Proofs arrive as a base64 data URL in the registration request body.
 */

export const ALLOWED_PROOF_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf'
];

// Max decoded size of a proof file (3 MB). The Express JSON body limit is 5 MB,
// so a 3 MB file (~4 MB as base64) stays comfortably within it.
export const MAX_PROOF_BYTES = 3 * 1024 * 1024;

export interface ParsedProof {
  dataUrl: string;
  contentType: string;
  size: number;
}

export interface ProofValidationResult {
  ok: boolean;
  error?: string;
  proof?: ParsedProof;
}

/**
 * Parse and validate a payment-proof data URL. Enforces the content-type
 * allowlist and the maximum decoded size. Returns a normalized proof on success.
 */
export function validatePaymentProof(input: any): ProofValidationResult {
  if (!input) {
    return { ok: false, error: 'Payment proof is required.' };
  }

  const dataUrl: string | undefined =
    typeof input === 'string' ? input : input.dataUrl;

  if (!dataUrl || typeof dataUrl !== 'string') {
    return { ok: false, error: 'Payment proof file is missing or invalid.' };
  }

  const match = dataUrl.match(/^data:([\w.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return { ok: false, error: 'Payment proof must be a valid base64-encoded image or PDF.' };
  }

  const contentType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, '');

  if (!ALLOWED_PROOF_TYPES.includes(contentType)) {
    return {
      ok: false,
      error: 'Payment proof must be a PNG, JPG, WEBP image or a PDF file.'
    };
  }

  let size: number;
  try {
    size = Buffer.from(base64, 'base64').length;
  } catch {
    return { ok: false, error: 'Payment proof could not be decoded.' };
  }

  if (size <= 0) {
    return { ok: false, error: 'Payment proof file is empty.' };
  }

  if (size > MAX_PROOF_BYTES) {
    return {
      ok: false,
      error: 'Payment proof is too large. Please upload a file under 3 MB.'
    };
  }

  // Re-normalize to a clean data URL (strip any whitespace inside the base64).
  return {
    ok: true,
    proof: {
      dataUrl: `data:${contentType};base64,${base64}`,
      contentType,
      size
    }
  };
}

/** Sanitize a client-supplied filename to a safe, short basename. */
export function sanitizeFilename(name: any, fallback = 'payment-proof'): string {
  if (!name || typeof name !== 'string') return fallback;
  const base = name.split(/[\\/]/).pop() || fallback;
  const cleaned = base.replace(/[^\w.\- ]/g, '').trim().slice(0, 120);
  return cleaned || fallback;
}
