import {
  CONTENT_TYPE_JSON,
  DATABASE_STATUS_CONNECTED,
  ERROR_DATABASE_UNAVAILABLE,
  ERROR_NOT_FOUND,
  HEADER_CONTENT_TYPE,
  SERVICE_NAME,
  SQL_SELECT_DATABASE_HEALTH,
} from "./constants";
import { Route } from "./routes";
import { isGetRequest, isRoute } from "./utils/request";

export interface Env {
  DB: D1Database;
}

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: {
      [HEADER_CONTENT_TYPE]: CONTENT_TYPE_JSON,
      ...init.headers,
    },
  });
}

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (isGetRequest(request) && isRoute(url, Route.Health)) {
      return json({
        ok: true,
        service: SERVICE_NAME,
      });
    }

    if (isGetRequest(request) && isRoute(url, Route.DatabaseHealth)) {
      try {
        const result = await _env.DB.prepare(
          SQL_SELECT_DATABASE_HEALTH,
        ).first();

        return json({
          ok: result?.ok === 1,
          database: DATABASE_STATUS_CONNECTED,
        });
      } catch {
        return json(
          {
            ok: false,
            error: ERROR_DATABASE_UNAVAILABLE,
          },
          { status: 503 },
        );
      }
    }

    return json(
      {
        error: ERROR_NOT_FOUND,
      },
      { status: 404 },
    );
  },
};
