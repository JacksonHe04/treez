export type Domain = "music" | "film" | "book" | "game";

export type EntityKind =
  | "album"
  | "song"
  | "artist"
  | "film"
  | "director"
  | "book"
  | "author"
  | "game"
  | "studio";

export type TreezUser = {
  id: string;
  username: string | null;
};

export type Env = {
  DB: D1Database;
  ASSETS?: R2Bucket;
  ENVIRONMENT: "development" | "production";
  CORS_ORIGINS: string;
  WRITE_SIGNING_SECRET: string;
};

export type AppVariables = {
  user: TreezUser;
};

export type AppBindings = {
  Bindings: Env;
  Variables: AppVariables;
};

export const domainKinds: Record<Domain, readonly EntityKind[]> = {
  music: ["album", "song", "artist"],
  film: ["film", "director"],
  book: ["book", "author"],
  game: ["game", "studio"],
};

export function isValidDomainKind(domain: Domain, kind: EntityKind): boolean {
  return domainKinds[domain].includes(kind);
}
