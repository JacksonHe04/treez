import type { TreezUser } from "../types";
import { slugify } from "../../../lib/treez/strings";

export function profileStatement(
  database: D1Database,
  user: TreezUser,
): D1PreparedStatement {
  const displayName = user.username ?? `Treez 用户 ${user.id.slice(0, 6)}`;
  const slug = user.username
    ? slugify(user.username)
    : `user-${user.id.slice(0, 12)}`;

  return database
    .prepare(
      `INSERT INTO profiles (id, slug, display_name)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(user.id, slug, displayName);
}
