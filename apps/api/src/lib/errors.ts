/**
 * Base application error with structured fields for API responses.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(opts: {
    code: string;
    statusCode: number;
    message: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = 'AppError';
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.details = opts.details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ── Common error factories ─────────────────────────────────────────

export function NotFound(resource: string, id?: string): AppError {
  const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
  return new AppError({
    code: 'NOT_FOUND',
    statusCode: 404,
    message: msg,
  });
}

export function BadRequest(message: string, details?: unknown): AppError {
  return new AppError({
    code: 'BAD_REQUEST',
    statusCode: 400,
    message,
    details,
  });
}

export function ValidationError(
  message: string,
  details?: unknown,
): AppError {
  return new AppError({
    code: 'VALIDATION_ERROR',
    statusCode: 422,
    message,
    details,
  });
}

export function SimulationError(message: string, details?: unknown): AppError {
  return new AppError({
    code: 'SIMULATION_ERROR',
    statusCode: 500,
    message,
    details,
  });
}
