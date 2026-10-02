-- One row per answered problem.
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,              -- Cloudflare Access email ("local" in dev)
  hand TEXT NOT NULL,                 -- 13 tiles before the draw, e.g. "123m456p789s1122z"
  draw TEXT NOT NULL,                 -- drawn tile, e.g. "5z"
  discard_chosen TEXT NOT NULL,
  discard_optimal TEXT NOT NULL,      -- comma-separated when several tie, e.g. "5z,9m"
  was_correct INTEGER NOT NULL CHECK (was_correct IN (0, 1)),
  shanten INTEGER NOT NULL,           -- shanten after the optimal discard
  ukeire_chosen INTEGER NOT NULL,
  ukeire_optimal INTEGER NOT NULL,
  category TEXT NOT NULL,             -- shape the optimal discard is cut from (see src/lib/mahjong/shapes.ts)
  chosen_shape TEXT NOT NULL,         -- shape the chosen discard was cut from
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX attempts_user_id ON attempts (user_id, id);
