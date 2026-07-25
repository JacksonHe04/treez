import type { Domain, EntityKind } from "./config";

export type EntitySummary = {
  id: string;
  domain: Domain;
  kind: EntityKind;
  name: string;
  description?: string | null;
  release_date?: string | null;
  published_at?: string;
  cover_url?: string | null;
  rating_count: number;
  average_score: number | null;
};

export type EntityRelation = {
  id: string;
  relation_type: string;
  position: number;
  note: string | null;
  entity_id: string;
  domain: Domain;
  kind: EntityKind;
  name: string;
  direction: "incoming" | "outgoing";
};

export type PublicRating = {
  id: string;
  score: number;
  comment: string | null;
  commented_at: string;
  rated_at: string;
  profile_slug: string;
  display_name: string;
  avatar_url: string | null;
  tags: Array<{ slug: string; name: string }>;
};

export type EntityDetail = EntitySummary & {
  metadata: Array<{
    key: string;
    value: string;
    value_type: string;
    position: number;
  }>;
  aliases: Array<{ alias: string; locale: string | null }>;
  relations: EntityRelation[];
  ratings: PublicRating[];
};

export type ProfileRating = {
  id: string;
  score: number;
  comment: string | null;
  commented_at: string;
  rated_at: string;
  entity_id: string;
  name: string;
  domain: Domain;
  kind: EntityKind;
  cover_url: string | null;
  tags: Array<{ slug: string; name: string }>;
};

export type PublicProfile = {
  profile: {
    id: string;
    slug: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    joined_at: string;
  };
  ratings: ProfileRating[];
  domains: Array<{
    domain: Domain;
    rating_count: number;
    average_score: number;
  }>;
  tags: Array<{ slug: string; name: string; usage_count: number }>;
};

export type PublicHome = {
  recent: EntitySummary[];
  acclaimed: EntitySummary[];
  domains: Array<{ domain: Domain; entity_count: number }>;
};

export type ListResponse<T> = {
  data: T;
  meta?: { total: number; limit?: number; offset?: number };
};
