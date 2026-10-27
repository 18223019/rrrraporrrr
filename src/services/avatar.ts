/**
 * Foto profil custom — disimpan di Cloudflare KV (atau R2) lewat /api/avatar.
 * Catatan: endpoint ini hanya ada di Cloudflare Pages. Saat `npm run dev`
 * (Vite saja) avatar akan 404 dan otomatis jatuh ke inisial/foto lokal.
 * Untuk tes lokal pakai `npm run build && npm run pages:dev`.
 */

import { auth } from './firebase';

const VERSION_STORAGE_KEY = 'avatarVersion';
const OUTPUT_SIZE = 320; // px, persegi
const listeners = new Set<() => void>();

let avatarVersion = readStoredVersion();

function readStoredVersion(): string {
  try {
    return window.localStorage.getItem(VERSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setAvatarVersion(version: string) {
  avatarVersion = version;
  try {
    window.localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    // abaikan (mode private, dsb.)
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAvatarVersion(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAvatarVersion() {
  return avatarVersion;
}

export function getAvatarUrl(username: string, version = avatarVersion): string {
  const base = `/api/avatar/${encodeURIComponent(username.trim().toLowerCase())}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

/** Crop tengah jadi persegi + resize, supaya file kecil (<~100 KB). */
async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Gambar terlalu besar (maks 15 MB sebelum dikompres).');
  }

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close?.();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // Safari lama tidak bisa encode WEBP → fallback ke JPEG
  const webp = await toBlob('image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg', 0.85);
  if (!jpeg) throw new Error('Gagal mengompres gambar.');
  return jpeg;
}

async function authorizedFetch(init: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Kamu harus login dulu.');
  const token = await user.getIdToken();
  const response = await fetch('/api/avatar', {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Upload gagal (HTTP ${response.status})`);
  }
  return body as { success: boolean; version: number };
}

export async function uploadAvatar(file: File) {
  const blob = await prepareImage(file);
  const result = await authorizedFetch({
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  setAvatarVersion(String(result.version));
  return result;
}

export async function removeAvatar() {
  const result = await authorizedFetch({ method: 'DELETE' });
  setAvatarVersion(String(result.version));
  return result;
}
