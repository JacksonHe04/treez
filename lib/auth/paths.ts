function publicSsoPath(
  path: "end" | "refresh" | "start",
  returnTo: string,
): string {
  return `/sso/${path}?${new URLSearchParams({ returnTo })}`;
}

export function treezLoginPath(returnTo = "/"): string {
  return publicSsoPath("start", returnTo);
}

export function treezLogoutPath(returnTo = "/"): string {
  return publicSsoPath("end", returnTo);
}

export function treezRefreshPath(returnTo = "/"): string {
  return publicSsoPath("refresh", returnTo);
}
