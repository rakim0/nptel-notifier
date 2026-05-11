import { EMPTY_STRING, PATH_SEPARATOR } from "./constants";

export enum Route {
  Health = "/health",
  DatabaseHealth = "/db/health",
  Subscribers = "/subscribers",
  SyncSheet = "/sheets/sync",
}

export enum RouteSegment {
  CourseQueries = "course-queries",
}

export interface SubscriberCourseQueriesRoute {
  subscriberId: string;
}

export function matchSubscriberCourseQueriesRoute(
  url: URL,
): SubscriberCourseQueriesRoute | null {
  const segments = url.pathname
    .split(PATH_SEPARATOR)
    .filter((segment) => segment !== EMPTY_STRING);
  const subscribersSegment = Route.Subscribers.replace(
    PATH_SEPARATOR,
    EMPTY_STRING,
  );

  if (
    segments.length === 3 &&
    segments[0] === subscribersSegment &&
    segments[2] === RouteSegment.CourseQueries
  ) {
    return {
      subscriberId: decodeURIComponent(segments[1]),
    };
  }

  return null;
}

export interface CourseQueryResourceRoute {
  subscriberId: string;
  queryId: string;
}

export function matchCourseQueryResourceRoute(
  url: URL,
): CourseQueryResourceRoute | null {
  const segments = url.pathname
    .split(PATH_SEPARATOR)
    .filter((segment) => segment !== EMPTY_STRING);
  const subscribersSegment = Route.Subscribers.replace(
    PATH_SEPARATOR,
    EMPTY_STRING,
  );

  if (
    segments.length === 4 &&
    segments[0] === subscribersSegment &&
    segments[2] === RouteSegment.CourseQueries
  ) {
    return {
      subscriberId: decodeURIComponent(segments[1]),
      queryId: decodeURIComponent(segments[3]),
    };
  }

  return null;
}
