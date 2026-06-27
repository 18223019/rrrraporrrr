/**
 * Member Full Names Mapping
 * Maps username (panggilan) to full name (nama panjang)
 */

// Kosongkan untuk kepengurusan baru
export const MEMBER_FULL_NAMES: Record<string, string> = {};

/**
 * Get full name from username
 */
export function getFullName(username: string): string {
  return MEMBER_FULL_NAMES[username] || username;
}
