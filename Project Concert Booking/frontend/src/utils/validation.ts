import type { ZodError } from "zod";

/**
 * Converts a ZodError into a simple `{ fieldPath: message }` map, keeping
 * only the first error message for each field path (nested array fields
 * use dotted paths such as `zones.0.name`).
 */
export const getFieldErrors = (error: ZodError): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.map((part) => String(part)).join(".");
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
};
