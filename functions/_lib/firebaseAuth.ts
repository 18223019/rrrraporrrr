/// <reference types="@cloudflare/workers-types" />

/**
 * Verifikasi Firebase ID token di Cloudflare (tanpa firebase-admin).
 * Token didapat di browser lewat `auth.currentUser.getIdToken()`.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  /** Bagian sebelum "@" dari email sintetis, mis. "budi" dari budi@asrama.com */
  username: string;
  role?: string;
}

export async function verifyFirebaseRequest(
  request: Request,
  projectId: string | undefined,
): Promise<VerifiedFirebaseUser | null> {
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID not configured');
  }

  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!uid || !email) {
      return null;
    }

    return {
      uid,
      email,
      username: email.split('@')[0].toLowerCase(),
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  } catch (error) {
    console.warn('⚠️ Invalid Firebase token:', error);
    return null;
  }
}
