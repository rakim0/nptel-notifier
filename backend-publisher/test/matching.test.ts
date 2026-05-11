import { describe, expect, it } from "vitest";
import {
  CourseMatcher,
  matchSubscriberQueries,
  CourseEntry,
} from "../src/matching";

function buildMatcher(entries: CourseEntry[]): CourseMatcher {
  return new CourseMatcher(entries);
}

const sampleCourses: CourseEntry[] = [
  { id: "noc26-cy39", name: "Symmetry, Stereochemistry and Applications" },
  {
    id: "noc26-ma10",
    name: "Introduction to Algebraic Geometry and Commutative Algebra",
  },
  { id: "noc26-ma48", name: "Algebraic Combinatorics" },
  { id: "noc26-ma51", name: "Functional Analysis" },
  {
    id: "noc26-oe02",
    name: "Advanced Design of Steel Structures",
  },
  { id: "noc26-cs01", name: "Cloud Computing" },
  { id: "noc26-cs02", name: "Machine Learning for Engineering" },
  { id: "noc26-cs03", name: "Data Structures and Algorithms" },
];

describe("CourseMatcher", () => {
  it("matches exact course name", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("Cloud Computing");

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].courseName).toBe("Cloud Computing");
    expect(results[0].courseId).toBe("noc26-cs01");
    expect(results[0].score).toBeGreaterThan(100);
  });

  it("matches by substring", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("cloud");

    expect(results.some((r) => r.courseName === "Cloud Computing")).toBe(true);
  });

  it("matches by partial tokens across words", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("algebra geo");

    expect(
      results.some((r) =>
        r.courseName.includes("Algebraic Geometry"),
      ),
    ).toBe(true);
  });

  it("matches by exact course ID", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("noc26-cy39");

    expect(results).toHaveLength(1);
    expect(results[0].courseId).toBe("noc26-cy39");
    expect(results[0].courseName).toBe(
      "Symmetry, Stereochemistry and Applications",
    );
  });

  it("matches by partial course ID", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("cy39");

    expect(results.some((r) => r.courseId === "noc26-cy39")).toBe(true);
  });

  it("returns empty array for no match", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("zoology");

    expect(results).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    const matcher = buildMatcher(sampleCourses);

    expect(matcher.find("")).toEqual([]);
    expect(matcher.find("   ")).toEqual([]);
  });

  it("is case insensitive", () => {
    const matcher = buildMatcher(sampleCourses);

    const lower = matcher.find("cloud computing");
    const upper = matcher.find("CLOUD COMPUTING");
    const mixed = matcher.find("Cloud Computing");

    expect(lower[0].courseId).toBe("noc26-cs01");
    expect(upper[0].courseId).toBe("noc26-cs01");
    expect(mixed[0].courseId).toBe("noc26-cs01");
  });

  it("respects score threshold", () => {
    const matcher = buildMatcher(sampleCourses);

    const lenient = matcher.find("steel", 0);
    const strict = matcher.find("steel", 200);

    expect(
      lenient.some((r) => r.courseName.includes("Steel")),
    ).toBe(true);
    expect(strict).toEqual([]);
  });

  it("returns multiple matches when multiple courses match", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("algebra");

    const names = results.map((r) => r.courseName);
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(
      names.some((n) => n.includes("Algebraic Geometry")),
    ).toBe(true);
    expect(names.some((n) => n.includes("Algebraic Combinatorics"))).toBe(true);
  });

  it("ranks better matches higher", () => {
    const matcher = buildMatcher(sampleCourses);

    const results = matcher.find("machine learning");

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].courseName).toBe("Machine Learning for Engineering");
  });
});

describe("matchSubscriberQueries", () => {
  it("returns matches grouped by subscriber", () => {
    const matcher = buildMatcher(sampleCourses);

    const matches = matchSubscriberQueries(matcher, [
      { subscriberId: "sub-1", courseQuery: "algebra" },
      { subscriberId: "sub-2", courseQuery: "steel" },
      { subscriberId: "sub-3", courseQuery: "zoology" },
    ]);

    expect(matches).toHaveLength(2);

    const sub1 = matches.find((m) => m.subscriberId === "sub-1")!;
    expect(sub1.courseQuery).toBe("algebra");
    expect(sub1.matches.length).toBeGreaterThanOrEqual(2);

    const sub2 = matches.find((m) => m.subscriberId === "sub-2")!;
    expect(sub2.matches.some((r) => r.courseName.includes("Steel"))).toBe(
      true,
    );

    expect(matches.find((m) => m.subscriberId === "sub-3")).toBeUndefined();
  });

  it("returns empty array when no subscriber has matches", () => {
    const matcher = buildMatcher(sampleCourses);

    const matches = matchSubscriberQueries(matcher, [
      { subscriberId: "sub-1", courseQuery: "zoology" },
    ]);

    expect(matches).toEqual([]);
  });

  it("respects custom threshold", () => {
    const matcher = buildMatcher(sampleCourses);

    const strict = matchSubscriberQueries(
      matcher,
      [{ subscriberId: "sub-1", courseQuery: "cl" }],
      100,
    );

    expect(strict).toEqual([]);
  });
});
