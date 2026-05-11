interface CourseResultRow {
  course_id: string;
  course_name: string;
  scores_published_on: string;
  certificates_available_on: string;
  score_issue_report_deadline: string;
}

interface SubscriberRow {
  id: string;
  contact_type: string;
  contact_value: string;
}

interface SubscriberCourseQueryRow {
  subscriber_id: string;
  course_query: string;
}

export interface NotificationProvider {
  send(contactValue: string, message: string): Promise<void>;
}

export class TelegramProvider implements NotificationProvider {
  private readonly apiUrl: string;

  constructor(botToken: string) {
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async send(chatId: string, message: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const body = await response.json() as { description?: string };
      throw new Error(`Telegram API error: ${body.description ?? response.statusText}`);
    }
  }
}

function buildMessage(course: CourseResultRow): string {
  const lines: string[] = [
    `<b>${escapeHtml(course.course_name)}</b> (${escapeHtml(course.course_id)})`,
  ];

  if (course.scores_published_on) {
    lines.push(`Scores published: ${escapeHtml(course.scores_published_on)}`);
  }
  if (course.certificates_available_on) {
    lines.push(`Certificates available: ${escapeHtml(course.certificates_available_on)}`);
  }
  if (course.score_issue_report_deadline) {
    lines.push(`Report issues by: ${escapeHtml(course.score_issue_report_deadline)}`);
  }

  lines.push("");
  lines.push('<a href="https://internalapp.nptel.ac.in/">Check your results</a>');

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface DispatchResult {
  sent: number;
  skipped: number;
  failed: number;
}

const SQL_SELECT_COURSE_RESULTS_BY_IDS = `
  SELECT course_id, course_name, scores_published_on,
         certificates_available_on, score_issue_report_deadline
  FROM course_results
  WHERE course_id IN (SELECT value FROM json_each(?))
`;

const SQL_SELECT_ALL_SUBSCRIBER_QUERIES = `
  SELECT subscriber_id, course_query
  FROM subscriber_course_queries
  ORDER BY subscriber_id
`;

const SQL_SELECT_SUBSCRIBERS_BY_IDS = `
  SELECT id, contact_type, contact_value
  FROM subscribers
  WHERE contact_type = 'telegram'
    AND id IN (SELECT value FROM json_each(?))
`;

const SQL_SELECT_NOTIFICATION_EXISTS = `
  SELECT id
  FROM notifications
  WHERE subscriber_id = ? AND course_id = ?
  LIMIT 1
`;

const SQL_INSERT_NOTIFICATION = `
  INSERT INTO notifications (id, subscriber_id, course_id, notification_type, sent_at)
  VALUES (?, ?, ?, 'course_update', ?)
`;

import { CourseMatcher, matchSubscriberQueries } from "./matching";

export async function dispatchNotifications(
  db: D1Database,
  provider: NotificationProvider,
  changedCourseIds: string[],
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, skipped: 0, failed: 0 };

  if (changedCourseIds.length === 0) {
    return result;
  }

  const courseIdsJson = JSON.stringify(changedCourseIds);

  const changedCourses = await db
    .prepare(SQL_SELECT_COURSE_RESULTS_BY_IDS)
    .bind(courseIdsJson)
    .all<CourseResultRow>();

  if (changedCourses.results.length === 0) {
    return result;
  }

  const courseEntries = changedCourses.results.map((c) => ({
    id: c.course_id,
    name: c.course_name,
  }));

  const matcher = new CourseMatcher(courseEntries);

  const queries = await db
    .prepare(SQL_SELECT_ALL_SUBSCRIBER_QUERIES)
    .all<SubscriberCourseQueryRow>();

  const subscriberMatches = matchSubscriberQueries(
    matcher,
    queries.results.map((q) => ({
      subscriberId: q.subscriber_id,
      courseQuery: q.course_query,
    })),
  );

  if (subscriberMatches.length === 0) {
    return result;
  }

  const matchedSubscriberIds = [
    ...new Set(subscriberMatches.map((m) => m.subscriberId)),
  ];

  const subscribers = await db
    .prepare(SQL_SELECT_SUBSCRIBERS_BY_IDS)
    .bind(JSON.stringify(matchedSubscriberIds))
    .all<SubscriberRow>();

  const subscriberMap = new Map(
    subscribers.results.map((s) => [s.id, s]),
  );

  const courseMap = new Map(
    changedCourses.results.map((c) => [c.course_id, c]),
  );

  const existsStmt = db.prepare(SQL_SELECT_NOTIFICATION_EXISTS);
  const insertStmt = db.prepare(SQL_INSERT_NOTIFICATION);
  const now = new Date().toISOString();

  for (const match of subscriberMatches) {
    const subscriber = subscriberMap.get(match.subscriberId);
    if (!subscriber) continue;

    for (const m of match.matches) {
      const course = courseMap.get(m.courseId);
      if (!course) continue;

      const alreadySent = await existsStmt
        .bind(match.subscriberId, m.courseId)
        .first();

      if (alreadySent) {
        result.skipped++;
        continue;
      }

      try {
        const message = buildMessage(course);
        await provider.send(subscriber.contact_value, message);

        await insertStmt
          .bind(crypto.randomUUID(), match.subscriberId, m.courseId, now)
          .run();

        result.sent++;
      } catch {
        result.failed++;
      }
    }
  }

  return result;
}
