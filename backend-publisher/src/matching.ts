import { Fzf } from "fzf";

export interface CourseEntry {
  id: string;
  name: string;
}

export interface MatchResult {
  courseId: string;
  courseName: string;
  score: number;
}

const DEFAULT_THRESHOLD = 20;

export class CourseMatcher {
  private fzf: Fzf<CourseEntry[]>;

  constructor(courses: CourseEntry[]) {
    this.fzf = new Fzf(courses, {
      selector: (course) => `${course.id} ${course.name}`,
      casing: "case-insensitive",
      fuzzy: "v2",
      normalize: true,
      sort: true,
    });
  }

  find(query: string, threshold: number = DEFAULT_THRESHOLD): MatchResult[] {
    if (query.trim().length === 0) {
      return [];
    }

    return this.fzf
      .find(query)
      .filter((r) => r.score >= threshold)
      .map((r) => ({
        courseId: r.item.id,
        courseName: r.item.name,
        score: r.score,
      }));
  }
}

export interface SubscriberQuery {
  subscriberId: string;
  courseQuery: string;
}

export interface SubscriberMatch {
  subscriberId: string;
  courseQuery: string;
  matches: MatchResult[];
}

export function matchSubscriberQueries(
  matcher: CourseMatcher,
  queries: SubscriberQuery[],
  threshold: number = DEFAULT_THRESHOLD,
): SubscriberMatch[] {
  return queries
    .map((q) => ({
      subscriberId: q.subscriberId,
      courseQuery: q.courseQuery,
      matches: matcher.find(q.courseQuery, threshold),
    }))
    .filter((m) => m.matches.length > 0);
}
