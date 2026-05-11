import {
  CONTENT_TYPE_JSON,
  ERROR_NOT_FOUND,
  SERVICE_NAME,
} from "./constants";
import { Route } from "./routes";
import { isGetRequest, isRoute } from "./utils/request";

export interface Env {}

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: {
      "content-type": CONTENT_TYPE_JSON,
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

    return json(
      {
        error: ERROR_NOT_FOUND,
      },
      { status: 404 },
    );
  },
};
