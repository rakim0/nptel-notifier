export const SERVICE_NAME = "nptel-notifier-backend";

export const HEADER_CONTENT_TYPE = "content-type";

export const CONTENT_TYPE_JSON = "application/json; charset=utf-8";

export const EMPTY_STRING = "";

export const PATH_SEPARATOR = "/";

export const ERROR_NOT_FOUND = "Not found";

export const ERROR_DATABASE_UNAVAILABLE = "Database unavailable";

export const ERROR_INVALID_JSON = "Invalid JSON body";

export const ERROR_INVALID_SUBSCRIBER_REQUEST = "Invalid subscriber request";

export const ERROR_INVALID_COURSE_QUERY_REQUEST =
  "Invalid course query request";

export const ERROR_SUBSCRIBER_NOT_FOUND = "Subscriber not found";

export const ERROR_COURSE_QUERY_ALREADY_EXISTS = "Course query already exists";

export const DATABASE_STATUS_CONNECTED = "connected";

export const HTTP_METHOD_GET = "GET";

export const HTTP_METHOD_POST = "POST";

export const SQL_SELECT_DATABASE_HEALTH = "SELECT 1 AS ok";

export const SQL_SELECT_SUBSCRIBERS = `
  SELECT id, contact_type, contact_value, created_at
  FROM subscribers
  ORDER BY created_at DESC
`;

export const SQL_INSERT_SUBSCRIBER = `
  INSERT INTO subscribers (id, contact_type, contact_value, created_at)
  VALUES (?, ?, ?, ?)
`;

export const SQL_SELECT_SUBSCRIBER_BY_ID = `
  SELECT id
  FROM subscribers
  WHERE id = ?
  LIMIT 1
`;

export const SQL_SELECT_SUBSCRIBER_COURSE_QUERIES = `
  SELECT id, subscriber_id, course_query, created_at
  FROM subscriber_course_queries
  WHERE subscriber_id = ?
  ORDER BY created_at DESC
`;

export const SQL_SELECT_SUBSCRIBER_COURSE_QUERY_BY_VALUE = `
  SELECT id
  FROM subscriber_course_queries
  WHERE subscriber_id = ? AND course_query = ?
  LIMIT 1
`;

export const SQL_INSERT_SUBSCRIBER_COURSE_QUERY = `
  INSERT INTO subscriber_course_queries (id, subscriber_id, course_query, created_at)
  VALUES (?, ?, ?, ?)
`;

export const SQL_SELECT_COURSE_RESULT_BY_ID = `
  SELECT course_id, row_hash
  FROM course_results
  WHERE course_id = ?
  LIMIT 1
`;

export const SQL_INSERT_COURSE_RESULT = `
  INSERT INTO course_results
    (course_id, serial_number, course_name, scores_published_on,
     certificates_available_on, score_issue_report_deadline,
     row_hash, first_seen_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export const SQL_UPDATE_COURSE_RESULT = `
  UPDATE course_results
  SET serial_number = ?,
      course_name = ?,
      scores_published_on = ?,
      certificates_available_on = ?,
      score_issue_report_deadline = ?,
      row_hash = ?,
      updated_at = ?
  WHERE course_id = ?
`;
