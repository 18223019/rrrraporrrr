/**
 * User Service - Handle user data and member information
 */

import { getMembers, type Member } from './api';
import type { UserProfile } from '../types/user';
import { getMemberPhoto } from '../data/memberPhotos';

/**
 * Cache for members data
 */
let membersCache: Member[] | null = null;
let membersCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all members (with caching)
 */
export async function fetchMembers(): Promise<Member[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (membersCache && (now - membersCacheTime) < CACHE_DURATION) {
    return membersCache;
  }
  
  try {
    const response = await getMembers();
    
    if (response.success && response.data) {
      membersCache = response.data;
      membersCacheTime = now;
      return response.data;
    }
    
    throw new Error('Failed to fetch members');
  } catch (error) {
    console.error('Error fetching members:', error);
    // Return cache even if expired, better than nothing
    return membersCache || [];
  }
}

/**
 * Get member by username (panggilan)
 */
export async function getMemberByUsername(username: string): Promise<Member | null> {
  const members = await fetchMembers();
  const normalizedUsername = username.toLowerCase().trim();
  
  return members.find(
    m => m.username.toLowerCase() === normalizedUsername ||
         m.panggilan.toLowerCase() === normalizedUsername
  ) || null;
}

/**
 * Get member by email
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  const members = await fetchMembers();
  const normalizedEmail = email.toLowerCase().trim();
  
  return members.find(
    m => m.email.toLowerCase() === normalizedEmail
  ) || null;
}

/**
 * Get member by slug
 */
export async function getMemberBySlug(slug: string): Promise<Member | null> {
  const members = await fetchMembers();
  const normalizedSlug = slug.toLowerCase().trim();
  
  return members.find(
    m => m.slug.toLowerCase() === normalizedSlug
  ) || null;
}

/**
 * Generate user initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Convert Member to UserProfile
 */
export function memberToUserProfile(member: Member): UserProfile {
  const profilePhoto = getMemberPhoto({
    name: member.name,
    username: member.username,
    panggilan: member.panggilan,
    slug: member.slug,
  });

  const profile = {
    ...member,
    role: member.role as 'member' | 'coach', // Cast to proper type
    displayName: member.name,
    initials: getInitials(member.name),
    photoURL: profilePhoto,
  };

  console.log('profile.name:', profile.name);
  
  return profile;
}

/**
 * Get user profile from email (for Firebase Auth integration)
 */
export async function getUserProfileFromEmail(email: string): Promise<UserProfile | null> {
  const member = await getMemberByEmail(email);
  
  if (!member) {
    return null;
  }
  
  return memberToUserProfile(member);
}

/**
 * Get user profile from username
 */
export async function getUserProfileFromUsername(username: string): Promise<UserProfile | null> {
  const member = await getMemberByUsername(username);
  
  if (!member) {
    return null;
  }
  
  return memberToUserProfile(member);
}

/**
 * Clear members cache (useful after data updates)
 */
export function clearMembersCache(): void {
  membersCache = null;
  membersCacheTime = 0;
}
