import type { PublicProfile } from "./types";

export function emptyPublicProfile(user: {
  id: string;
  username: string | null;
}): PublicProfile {
  const username = user.username ?? "我的鉴赏";
  return {
    profile: {
      id: user.id,
      slug: user.username ?? `user-${user.id.slice(0, 12)}`,
      display_name: username,
      avatar_url: null,
      bio: null,
      joined_at: new Date().toISOString(),
    },
    ratings: [],
    domains: [],
    tags: [],
  };
}
