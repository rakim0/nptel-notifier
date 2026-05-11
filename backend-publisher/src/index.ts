import {
  DATABASE_STATUS_CONNECTED,
  ERROR_DATABASE_UNAVAILABLE,
  ERROR_INVALID_JSON,
  ERROR_INVALID_SUBSCRIBER_REQUEST,
  ERROR_NOT_FOUND,
  SERVICE_NAME,
  SQL_SELECT_DATABASE_HEALTH,
} from "./constants";
import { json } from "./http";
import { Route } from "./routes";
import { createSubscriber, listSubscribers } from "./subscribers";
import { isGetRequest, isPostRequest, isRoute } from "./utils/request";
import { toValidationErrorResponse } from "./validation";
import { ZodError } from "zod";

export interface Env {
  DB: D1Database;
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

    if (isGetRequest(request) && isRoute(url, Route.Subscribers)) {
      const subscribers = await listSubscribers(_env.DB);

      return json({
        subscribers,
      });
    }

    if (isPostRequest(request) && isRoute(url, Route.Subscribers)) {
      try {
        const body = await request.json();
        const subscriber = await createSubscriber(_env.DB, body);

        return json({ subscriber }, { status: 201 });
      } catch (error) {
        if (error instanceof ZodError) {
          return json(
            toValidationErrorResponse(
              ERROR_INVALID_SUBSCRIBER_REQUEST,
              error.issues,
            ),
            { status: 400 },
          );
        }

        return json(
          {
            error: ERROR_INVALID_JSON,
          },
          { status: 400 },
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
