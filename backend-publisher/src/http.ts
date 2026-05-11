import { CONTENT_TYPE_JSON, HEADER_CONTENT_TYPE } from "./constants";

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: {
      [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
      ...init.headers,
    },
  });
}
