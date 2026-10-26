import { createHash, randomBytes } from 'crypto';

/** Membuat token sesi acak (64 karakter hex) yang disimpan di cookie. */
export function buatToken(): string {
  return randomBytes(32).toString('hex');
}

/** Hash SHA-256 (64 karakter hex) yang disimpan di kolom auth_sesi.token_hash. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}