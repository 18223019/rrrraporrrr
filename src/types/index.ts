export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface UserClaims {
  role: 'coach' | 'member';
}

export interface Member {
  name: string;
  username: string; // slug/panggilan
  email: string;
  uid: string;
  nim?: string;
  jurusan?: string;
}

// Re-export types from user.ts
export type { Member as MemberProfile, UserProfile, DashboardStats } from './user';

export interface Score {
  name: string;
  category: string;
  score: number;
  month: string;
}

export interface MonthlyReport {
  member: string;
  month: string;
  scores: Score[];
  totalScore: number;
  rank?: number;
}
