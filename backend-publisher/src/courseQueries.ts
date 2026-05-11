import {
  ERROR_COURSE_QUERY_ALREADY_EXISTS,
  ERROR_SUBSCRIBER_NOT_FOUND,
  SQL_INSERT_SUBSCRIBER_COURSE_QUERY,
  SQL_SELECT_SUBSCRIBER_BY_ID,
  SQL_SELECT_SUBSCRIBER_COURSE_QUERY_BY_VALUE,
  SQL_SELECT_SUBSCRIBER_COURSE_QUERIES,
} from "./constants";
import { createCourseQuerySchema } from "./validation";

export interface SubscriberCourseQuery {
  id: string;
  subscriberId: string;
  courseQuery: string;
  createdAt: string;
}

interface SubscriberCourseQueryRow {
  id: string;
  subscriber_id: string;
  course_query: string;
  created_at: string;
}

interface IdRow {
  id: string;
}

export class CourseQueryError extends Error {}

export async function listSubscriberCourseQueries(
  db: D1Database,
  subscriberId: string,
): Promise<SubscriberCourseQuery[]> {
  const result = await db
    .prepare(SQL_SELECT_SUBSCRIBER_COURSE_QUERIES)
    .bind(subscriberId)
    .all<SubscriberCourseQueryRow>();

  return result.results.map(mapSubscriberCourseQueryRow);
}

export async function createSubscriberCourseQuery(
  db: D1Database,
  subscriberId: string,
  body: unknown,
): Promise<SubscriberCourseQuery> {
  const requestBody = createCourseQuerySchema.parse(body);
  const subscriber = await db
    .prepare(SQL_SELECT_SUBSCRIBER_BY_ID)
    .bind(subscriberId)
    .first<IdRow>();

  if (subscriber === null) {
    throw new CourseQueryError(ERROR_SUBSCRIBER_NOT_FOUND);
  }

  const existingCourseQuery = await db
    .prepare(SQL_SELECT_SUBSCRIBER_COURSE_QUERY_BY_VALUE)
    .bind(subscriberId, requestBody.courseQuery)
    .first<IdRow>();

  if (existingCourseQuery !== null) {
    throw new CourseQueryError(ERROR_COURSE_QUERY_ALREADY_EXISTS);
  }

  const courseQuery: SubscriberCourseQuery = {
    id: crypto.randomUUID(),
    subscriberId,
    courseQuery: requestBody.courseQuery,
    createdAt: new Date().toISOString(),
  };

  await db
    .prepare(SQL_INSERT_SUBSCRIBER_COURSE_QUERY)
    .bind(
      courseQuery.id,
      courseQuery.subscriberId,
      courseQuery.courseQuery,
      courseQuery.createdAt,
    )
    .run();

  return courseQuery;
}

function mapSubscriberCourseQueryRow(
  row: SubscriberCourseQueryRow,
): SubscriberCourseQuery {
  return {
    id: row.id,
    subscriberId: row.subscriber_id,
    courseQuery: row.course_query,
    createdAt: row.created_at,
  };
}
