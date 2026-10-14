-- A failed hand counts as mastered once it is answered correctly in "repeat mistakes" mode.
ALTER TABLE attempts ADD COLUMN mastered INTEGER NOT NULL DEFAULT 0;
CREATE INDEX attempts_pending_mistakes ON attempts (user_id, was_correct, mastered);

-- Lesson progress, synced across devices (latest update wins).
CREATE TABLE lesson_progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  correct INTEGER NOT NULL,
  answered INTEGER NOT NULL,
  completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
