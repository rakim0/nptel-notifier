export const SERVICE_NAME = "nptel-notifier-backend";

export const HEADER_CONTENT_TYPE = "content-type";

export const CONTENT_TYPE_JSON = "application/json; charset=utf-8";

export const ERROR_NOT_FOUND = "Not found";

export const ERROR_DATABASE_UNAVAILABLE = "Database unavailable";

export const ERROR_INVALID_JSON = "Invalid JSON body";

export const ERROR_INVALID_SUBSCRIBER_REQUEST = "Invalid subscriber request";

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
