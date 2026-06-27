export type CanaryTester = {
  name: string;
  email: string;
  username: string;
};

// Kosongkan untuk kepengurusan baru
export const CANARY_TESTERS: CanaryTester[] = [];

export const CANARY_TESTER_USERNAMES = new Set(
  CANARY_TESTERS.map((tester) => tester.username.toLowerCase()),
);
