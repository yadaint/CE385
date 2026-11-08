/**
 * Application-specific error carrying an HTTP status code.
 * Throwing this error from controllers/services lets the global
 * error handler return a clean, intentional API response.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
