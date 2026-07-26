ALTER TABLE assets RENAME COLUMN r2_key TO object_key;

DROP INDEX IF EXISTS assets_r2_key_idx;
CREATE INDEX assets_object_key_idx ON assets(object_key);
