UPDATE import_conflicts
SET
  status = 'ignored',
  resolution_note = 'Live Notion verification confirms three distinct tracks: 疼痛部 / v是兔子wishtoday, Pax / Loro’s, and Life After Small Town / 艾志恒Asen. Keep all source-backed entities separate.',
  resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'conflict_6e2be45c78ce66c145f7577753e6c7d7'
  AND status = 'open';

UPDATE import_conflicts
SET
  status = 'ignored',
  resolution_note = 'Live Notion verification shows one fully related and rated Immanu El track plus one later playlist-only source page. Evidence is insufficient for a destructive merge, so both source-backed entities remain separate.',
  resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'conflict_3be83b48bef55903f5e9b521c727cb55'
  AND status = 'open';
