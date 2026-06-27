/**
 * User Types - Real data structure from API
 */

import type { BidangScoreComputation, BidangType } from '../data/bidangConfig';

export interface Member {
  name: string;           // Nama lengkap dari Google Sheets (Column A)
  username: string;       // Panggilan dari Google Sheets (Column C)
  slug: string;           // URL-friendly version of username
  panggilan: string;      // Alias for username
  email: string;          // Email from Google Sheets (Column B)
  uid: string;            // Firebase UID (populated after auth)
  role: 'member' | 'coach';  // User role
  nim?: string;           // NIM from metadata sheet
  jurusan?: string;       // Jurusan/major from metadata sheet
}

export interface UserProfile extends Member {
  photoURL?: string;      // Optional photo URL
  displayName?: string;   // Display name (usually same as name)
  initials?: string;      // Auto-generated initials
}

export type DashboardBidangBreakdown = Record<BidangType, BidangScoreComputation>;

export interface DashboardStats {
  averageScore: number;
  ketakmiran: number;
  pembinaan: number;
  aktualisasi: number;
  internal: number;
  trend: number;
  bidangBreakdown: DashboardBidangBreakdown;
}
