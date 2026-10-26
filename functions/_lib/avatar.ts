export const avatarKey = (username: string) => `avatars/${username.toLowerCase()}`;

export const isValidUsername = (username: string) => /^[a-z0-9._-]{1,40}$/i.test(username);

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
