import {
  DATABASE_STATUS_CONNECTED,
  ERROR_COURSE_QUERY_ALREADY_EXISTS,
  ERROR_DATABASE_UNAVAILABLE,
  ERROR_INVALID_COURSE_QUERY_REQUEST,
  ERROR_INVALID_JSON,
  ERROR_INVALID_SUBSCRIBER_REQUEST,
  ERROR_NOT_FOUND,
  SERVICE_NAME,
  SQL_SELECT_DATABASE_HEALTH,
} from "./constants";
import {
  CourseQueryError,
  createSubscriberCourseQuery,
  deleteSubscriberCourseQuery,
  listSubscriberCourseQueries,
} from "./courseQueries";
import { json } from "./http";
import {
  matchCourseQueryResourceRoute,
  matchSubscriberCourseQueriesRoute,
  Route,
} from "./routes";
import { createSubscriber, listSubscribers } from "./subscribers";
import { syncSheet } from "./sheets";
import { dispatchNotifications, TelegramProvider } from "./notifications";
import { isDeleteRequest, isGetRequest, isPostRequest, isRoute } from "./utils/request";
import { toValidationErrorResponse } from "./validation";
import { ZodError } from "zod";

export interface Env {
  DB: D1Database;
  CSV_URL: string;
  SYNC_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
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

    if (isGetRequest(request) && isRoute(url, Route.SyncSheet)) {
      const authHeader = request.headers.get("Authorization") ?? "";
      const bearerToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";
      const token =
        bearerToken || (url.searchParams.get("token") ?? "");

      if (token !== _env.SYNC_SECRET) {
        return json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const result = await syncSheet(_env.DB, _env.CSV_URL);

        return json(result);
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error ? error.message : "Sheet sync failed",
          },
          { status: 502 },
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

        if (error instanceof CourseQueryError) {
          return json(
            {
              error: error.message,
            },
            {
              status:
                error.message === ERROR_COURSE_QUERY_ALREADY_EXISTS ? 409 : 404,
            },
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

    const subscriberCourseQueriesRoute = matchSubscriberCourseQueriesRoute(url);

    if (isGetRequest(request) && subscriberCourseQueriesRoute !== null) {
      const courseQueries = await listSubscriberCourseQueries(
        _env.DB,
        subscriberCourseQueriesRoute.subscriberId,
      );

      return json({
        courseQueries,
      });
    }

    if (isPostRequest(request) && subscriberCourseQueriesRoute !== null) {
      try {
        const body = await request.json();
        const courseQuery = await createSubscriberCourseQuery(
          _env.DB,
          subscriberCourseQueriesRoute.subscriberId,
          body,
        );

        return json({ courseQuery }, { status: 201 });
      } catch (error) {
        if (error instanceof ZodError) {
          return json(
            toValidationErrorResponse(
              ERROR_INVALID_COURSE_QUERY_REQUEST,
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

    const courseQueryResourceRoute = matchCourseQueryResourceRoute(url);

    if (isDeleteRequest(request) && courseQueryResourceRoute !== null) {
      try {
        await deleteSubscriberCourseQuery(
          _env.DB,
          courseQueryResourceRoute.subscriberId,
          courseQueryResourceRoute.queryId,
        );

        return json({ ok: true });
      } catch (error) {
        if (error instanceof CourseQueryError) {
          return json(
            { error: error.message },
            { status: 404 },
          );
        }

        return json(
          { error: ERROR_NOT_FOUND },
          { status: 404 },
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

  async scheduled(
    _event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const result = await syncSheet(_env.DB, _env.CSV_URL);

    console.log(
      `Sheet sync complete: ${result.new} new, ${result.updated} updated, ${result.unchanged} unchanged`,
    );

    if (result.courseIds.length > 0) {
      const provider = new TelegramProvider(_env.TELEGRAM_BOT_TOKEN);
      const dispatch = await dispatchNotifications(
        _env.DB,
        provider,
        result.courseIds,
      );

      console.log(
        `Notifications: ${dispatch.sent} sent, ${dispatch.skipped} skipped, ${dispatch.failed} failed`,
      );
    }
  },
};
