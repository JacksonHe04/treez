'use client';

export type TreezBrowserUser = {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
};

type SessionResponse = {
  user: TreezBrowserUser | null;
};

let cachedUser: TreezBrowserUser | null | undefined;
let pendingUser: Promise<TreezBrowserUser | null> | null = null;

export async function getTreezBrowserUser(): Promise<TreezBrowserUser | null> {
  if (cachedUser !== undefined) return cachedUser;
  if (pendingUser) return pendingUser;

  pendingUser = fetch('/api/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as SessionResponse;
      cachedUser = payload.user;
      return cachedUser;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    })
    .finally(() => {
      pendingUser = null;
    });

  return pendingUser;
}

export function treezLoginPath(returnTo = '/'): string {
  return `/api/auth/inon/login?${new URLSearchParams({ returnTo })}`;
}

export function treezLogoutPath(returnTo = '/'): string {
  return `/api/auth/inon/logout?${new URLSearchParams({ returnTo })}`;
}
