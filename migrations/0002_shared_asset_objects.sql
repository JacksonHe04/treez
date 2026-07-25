PRAGMA defer_foreign_keys = true;

CREATE TABLE assets_next (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('cover', 'avatar', 'attachment')),
  r2_key TEXT NOT NULL,
  source_url TEXT,
  content_type TEXT,
  byte_size INTEGER,
  checksum TEXT,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO assets_next (
  id, entity_id, kind, r2_key, source_url, content_type,
  byte_size, checksum, alt_text, created_at
)
SELECT
  id, entity_id, kind, r2_key, source_url, content_type,
  byte_size, checksum, alt_text, created_at
FROM assets;

DROP TABLE assets;
ALTER TABLE assets_next RENAME TO assets;

CREATE INDEX assets_entity_idx ON assets(entity_id, kind);
CREATE INDEX assets_r2_key_idx ON assets(r2_key);
