import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

interface ValidationSchemaMap {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Generic Zod validation middleware.
 * Pass any combination of `body`, `query` and `params` schemas.
 * Parsed (and transformed) data replaces the original request data.
 * On failure, a ZodError is forwarded to the global error handler,
 * which converts it into a 422 response with per-field messages.
 */
export const validate =
  (schemas: ValidationSchemaMap): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        Object.assign(req.params, schemas.params.parse(req.params));
      }

      if (schemas.query) {
        Object.assign(req.query, schemas.query.parse(req.query));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
