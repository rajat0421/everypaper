export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }

  static badRequest(message = "Invalid request"): HttpError {
    return new HttpError(400, "VALIDATION_ERROR", message);
  }

  static forbidden(message = "Forbidden"): HttpError {
    return new HttpError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Not found"): HttpError {
    return new HttpError(404, "NOT_FOUND", message);
  }

  static unauthorized(message = "Unauthorized"): HttpError {
    return new HttpError(401, "UNAUTHORIZED", message);
  }

  static rateLimited(message = "Too many requests"): HttpError {
    return new HttpError(429, "RATE_LIMITED", message);
  }
}
