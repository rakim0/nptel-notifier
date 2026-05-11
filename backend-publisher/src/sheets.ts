import Papa from "papaparse";
import {
  SQL_INSERT_COURSE_RESULT,
  SQL_SELECT_COURSE_RESULT_BY_ID,
  SQL_UPDATE_COURSE_RESULT,
} from "./constants";

/**
 * A single row parsed from the NPTEL CSV export.
 * Columns mapped from the sheet: A=S.No, B=Course Id, C=Course Name,
 * J=Scores published on, K=E_certificates available on, L=For reporting issues on Scores.
 */
export interface ParsedCourseRow {
  serialNumber: number;
  courseId: string;
  courseName: string;
  scoresPublishedOn: string;
  certificatesAvailableOn: string;
  scoreIssueReportDeadline: string;
}

export interface SyncResult {
  new: number;
  updated: number;
  unchanged: number;
  courseIds: string[];
}

interface ExistingRow {
  course_id: string;
  row_hash: string;
}

interface CourseResultInsert {
  courseId: string;
  serialNumber: number;
  courseName: string;
  scoresPublishedOn: string;
  certificatesAvailableOn: string;
  scoreIssueReportDeadline: string;
  rowHash: string;
  timestamp: string;
}

export async function fetchCourseCsv(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSV: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

export function parseCourseCsv(csv: string): ParsedCourseRow[] {
  const lines = csv.split("\n");
  let headerIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("S. No")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return [];
  }

  // Skip the column-letter row (A,B,C,...) that sits between header and data
  const dataStartIndex = headerIndex + 2;
  const cleanCsv =
    lines[headerIndex] + "\n" + lines.slice(dataStartIndex).join("\n");

  const result = Papa.parse<Record<string, string>>(cleanCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows: ParsedCourseRow[] = [];

  for (const record of result.data) {
    const serialNumber = parseInt(record["S. No"]?.trim() ?? "", 10);
    const courseId = record["Course Id"]?.trim() ?? "";
    const courseName = record["Course Name"]?.trim() ?? "";

    if (isNaN(serialNumber) || !courseId || !courseName) {
      continue;
    }

    rows.push({
      serialNumber,
      courseId,
      courseName,
      scoresPublishedOn: record["Scores published on*"]?.trim() ?? "",
      certificatesAvailableOn:
        record["E_certificates available on*"]?.trim() ?? "",
      scoreIssueReportDeadline:
        record["For reporting issues on Scores"]?.trim() ?? "",
    });
  }

  return rows;
}

export async function computeRowHash(row: ParsedCourseRow): Promise<string> {
  return sha256(
    `${row.courseName}|${row.scoresPublishedOn}|${row.certificatesAvailableOn}|${row.scoreIssueReportDeadline}`,
  );
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Upsert parsed course rows into the `course_results` table.
 *
 * For each row:
 *   - New course_id  → INSERT (first_seen_at = now)
 *   - Existing, hash changed → UPDATE (updated_at = now)
 *   - Existing, hash unchanged → skip
 */
export async function upsertCourseResults(
  db: D1Database,
  inserts: CourseResultInsert[],
): Promise<SyncResult> {
  const result: SyncResult = { new: 0, updated: 0, unchanged: 0, courseIds: [] };

  const selectStmt = db.prepare(SQL_SELECT_COURSE_RESULT_BY_ID);
  const insertStmt = db.prepare(SQL_INSERT_COURSE_RESULT);
  const updateStmt = db.prepare(SQL_UPDATE_COURSE_RESULT);

  for (const insert of inserts) {
    const existing = await selectStmt
      .bind(insert.courseId)
      .first<ExistingRow>();

    if (existing === null) {
      await insertStmt
        .bind(
          insert.courseId,
          insert.serialNumber,
          insert.courseName,
          insert.scoresPublishedOn,
          insert.certificatesAvailableOn,
          insert.scoreIssueReportDeadline,
          insert.rowHash,
          insert.timestamp,
          insert.timestamp,
        )
        .run();
      result.new++;
      result.courseIds.push(insert.courseId);
    } else if (existing.row_hash !== insert.rowHash) {
      await updateStmt
        .bind(
          insert.serialNumber,
          insert.courseName,
          insert.scoresPublishedOn,
          insert.certificatesAvailableOn,
          insert.scoreIssueReportDeadline,
          insert.rowHash,
          insert.timestamp,
          insert.courseId,
        )
        .run();
      result.updated++;
      result.courseIds.push(insert.courseId);
    } else {
      result.unchanged++;
    }
  }

  return result;
}

export async function syncSheet(
  db: D1Database,
  csvUrl: string,
): Promise<SyncResult> {
  const csv = await fetchCourseCsv(csvUrl);
  const parsedRows = parseCourseCsv(csv);

  if (parsedRows.length === 0) {
    return { new: 0, updated: 0, unchanged: 0, courseIds: [] };
  }

  const rowHashes = await Promise.all(parsedRows.map(computeRowHash));
  const timestamp = new Date().toISOString();

  const inserts: CourseResultInsert[] = parsedRows.map((row, index) => ({
    courseId: row.courseId,
    serialNumber: row.serialNumber,
    courseName: row.courseName,
    scoresPublishedOn: row.scoresPublishedOn,
    certificatesAvailableOn: row.certificatesAvailableOn,
    scoreIssueReportDeadline: row.scoreIssueReportDeadline,
    rowHash: rowHashes[index],
    timestamp,
  }));

  return upsertCourseResults(db, inserts);
}
