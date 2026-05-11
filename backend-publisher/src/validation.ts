import { z } from "zod";

export const createSubscriberSchema = z.object({
  contactType: z.string().trim().min(1),
  contactValue: z.string().trim().min(1),
});

export const createCourseQuerySchema = z.object({
  courseQuery: z.string().trim().min(1),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;

export type CreateCourseQueryInput = z.infer<typeof createCourseQuerySchema>;

export interface ValidationErrorResponse {
  error: string;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export function toValidationErrorResponse(
  error: string,
  issues: z.ZodIssue[],
): ValidationErrorResponse {
  return {
    error,
    issues: issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
