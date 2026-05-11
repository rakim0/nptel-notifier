CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  contact_type TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_results (
  course_id TEXT PRIMARY KEY,
  serial_number INTEGER,
  course_name TEXT NOT NULL,
  scores_published_on TEXT,
  certificates_available_on TEXT,
  score_issue_report_deadline TEXT,
  row_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  UNIQUE (subscriber_id, course_id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers (id),
  FOREIGN KEY (course_id) REFERENCES course_results (course_id)
);
