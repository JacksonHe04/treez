PRAGMA foreign_keys = ON;

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('music', 'film', 'book', 'game')),
  kind TEXT NOT NULL CHECK (
    kind IN ('album', 'song', 'artist', 'film', 'director', 'book', 'author', 'game', 'studio')
  ),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  description TEXT,
  release_date TEXT,
  cover_asset_id TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public = 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (domain = 'music' AND kind IN ('album', 'song', 'artist')) OR
    (domain = 'film' AND kind IN ('film', 'director')) OR
    (domain = 'book' AND kind IN ('book', 'author')) OR
    (domain = 'game' AND kind IN ('game', 'studio'))
  )
);

CREATE INDEX entities_domain_kind_name_idx
  ON entities(domain, kind, normalized_name);
CREATE INDEX entities_published_idx
  ON entities(published_at DESC, id);

CREATE TABLE entity_aliases (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  locale TEXT,
  UNIQUE(entity_id, normalized_alias)
);

CREATE INDEX entity_aliases_lookup_idx ON entity_aliases(normalized_alias);

CREATE TABLE entity_metadata (
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text'
    CHECK (value_type IN ('text', 'number', 'date', 'boolean', 'json')),
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_id, key, position)
);

CREATE INDEX entity_metadata_filter_idx ON entity_metadata(key, value);

CREATE TABLE entity_relations (
  id TEXT PRIMARY KEY,
  from_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN ('created_by', 'track_of', 'contributed_by', 'related_to')),
  position INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(from_entity_id, to_entity_id, relation_type)
);

CREATE INDEX entity_relations_from_idx
  ON entity_relations(from_entity_id, relation_type, position);
CREATE INDEX entity_relations_to_idx
  ON entity_relations(to_entity_id, relation_type, position);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('cover', 'avatar', 'attachment')),
  r2_key TEXT NOT NULL UNIQUE,
  source_url TEXT,
  content_type TEXT,
  byte_size INTEGER,
  checksum TEXT,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX assets_entity_idx ON assets(entity_id, kind);

CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  score_tenths INTEGER NOT NULL CHECK (score_tenths BETWEEN 0 AND 100),
  comment TEXT,
  commented_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, entity_id)
);

CREATE INDEX ratings_entity_recent_idx ON ratings(entity_id, rated_at DESC);
CREATE INDEX ratings_user_recent_idx ON ratings(user_id, rated_at DESC);

CREATE TABLE rating_events (
  id TEXT PRIMARY KEY,
  rating_id TEXT NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  score_tenths INTEGER NOT NULL CHECK (score_tenths BETWEEN 0 AND 100),
  comment TEXT,
  commented_at TEXT NOT NULL,
  rated_at TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'imported'))
);

CREATE INDEX rating_events_rating_idx ON rating_events(rating_id, rated_at DESC);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE rating_tags (
  rating_id TEXT NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rating_id, tag_id)
);

CREATE INDEX rating_tags_tag_idx ON rating_tags(tag_id, rating_id);

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('dry-run', 'apply')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('local-notion', 'cloud-notion', 'cross-validated')),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT
);

CREATE TABLE source_records (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL
    CHECK (record_type IN ('entity', 'relation', 'rating', 'asset', 'profile')),
  record_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('local-notion', 'cloud-notion', 'user')),
  source_id TEXT NOT NULL,
  external_id TEXT,
  source_path TEXT,
  source_url TEXT,
  checksum TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'conflict')),
  import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
  source_updated_at TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  raw_json TEXT,
  UNIQUE(source, source_id, record_type)
);

CREATE INDEX source_records_target_idx ON source_records(record_type, record_id);
CREATE INDEX source_records_batch_idx ON source_records(import_batch_id);

CREATE TABLE import_conflicts (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  source_record_id TEXT,
  candidate_record_id TEXT,
  details_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);

CREATE INDEX import_conflicts_batch_idx
  ON import_conflicts(import_batch_id, status);

CREATE VIEW entity_rating_summary AS
SELECT
  e.id AS entity_id,
  COUNT(r.id) AS rating_count,
  ROUND(AVG(r.score_tenths) / 10.0, 2) AS average_score
FROM entities e
LEFT JOIN ratings r ON r.entity_id = e.id
GROUP BY e.id;
