import { Prisma } from '../../generated/prisma/client';

export enum ExceptionCode {
  ACCESS_DENIED = 'ACCESS_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  RECORD_CONFLICT = 'RECORD_CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
}

// Exception messages with corresponding HTTP status codes
const exceptionConfig = {
  [ExceptionCode.ACCESS_DENIED]: {
    message: "You don't have necessary permissions to access this resource.",
    status: 403,
  },
  [ExceptionCode.NOT_FOUND]: {
    message: 'Resource not found or might be deleted.',
    status: 404,
  },
  [ExceptionCode.RECORD_CONFLICT]: {
    message: 'Record already exists.',
    status: 409,
  },
  [ExceptionCode.INTERNAL_SERVER_ERROR]: {
    message:
      'An error occured while processing your request, try again. If this issue persit, please contact our support team via our support channels.',
    status: 500,
  },
  [ExceptionCode.UNAUTHORIZED]: {
    message: 'Login to continue action.',
    status: 401,
  },
  [ExceptionCode.FORBIDDEN]: {
    message: "You can't perform this action",
    status: 401,
  },
  [ExceptionCode.BAD_REQUEST]: {
    message: 'Invalid or wrong parameter(s) provided for this request.',
    status: 401,
  },
  [ExceptionCode.UNPROCESSABLE_ENTITY]: {
    message: "Can't process this request at the moment, please try again later",
    status: 422,
  },
};

// Custom exception class that follows your desired format
export class CustomException extends Error {
  public readonly code: ExceptionCode;
  public readonly status: number;

  constructor(code: ExceptionCode, customMessage?: string, fieldName?: string) {
    const config = exceptionConfig[code];
    let message = customMessage || config.message;

    // Replace field_name placeholder if provided
    if (fieldName && message.includes('(field_name)')) {
      message = message.replace('(field_name)', fieldName);
    }

    super(message);
    this.name = 'CustomException';
    this.code = code;
    this.status = config.status;
  }

  // Method to return the error in your desired format
  toJSON() {
    return {
      message: this.message,
      code: this.code,
      status: this.status,
    };
  }
}

// Convenience factory methods for creating specific exceptions
export class ExceptionFactory {
  static accessDenied(customMessage?: string) {
    return new CustomException(ExceptionCode.ACCESS_DENIED, customMessage);
  }

  static notFound(customMessage?: string) {
    return new CustomException(ExceptionCode.NOT_FOUND, customMessage);
  }

  static recordConflict(customMessage?: string) {
    return new CustomException(ExceptionCode.RECORD_CONFLICT, customMessage);
  }

  static internalServerError(customMessage?: string) {
    return new CustomException(ExceptionCode.INTERNAL_SERVER_ERROR, customMessage);
  }
  static unauthorized(customMessage?: string) {
    return new CustomException(ExceptionCode.UNAUTHORIZED, customMessage);
  }
  static badRequest(customMessage?: string) {
    return new CustomException(ExceptionCode.BAD_REQUEST, customMessage);
  }
  static forbidden(customMessage?: string) {
    return new CustomException(ExceptionCode.FORBIDDEN, customMessage);
  }
  static unProcessable(customMessage?: string) {
    return new CustomException(ExceptionCode.UNPROCESSABLE_ENTITY, customMessage);
  }
}

export class ExceptionHandler {
  static handle(e: any): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Database Error:', e);
      throw this.normalizeDatabaseError(e);
    }

    if (e instanceof CustomException) {
      throw e; // Already in the correct format
    }

    console.error('Unexpected Error:', e);
    throw ExceptionFactory.internalServerError();
  }

  private static normalizeDatabaseError(e: Prisma.PrismaClientKnownRequestError): CustomException {
    switch (e.code) {
      case 'P2002': // Unique constraint violation
        const target = e.meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';
        return ExceptionFactory.recordConflict(`Record with this ${field} already exists.`);

      case 'P2025': // Record not found
        return ExceptionFactory.notFound('Record not found.');

      case 'P2003': // Foreign key constraint violation
        return ExceptionFactory.badRequest('Invalid reference to related record.');

      case 'P2011': // Null constraint violation
        const nullField = e.meta?.column_name as string | undefined;
        return ExceptionFactory.badRequest(
          `Required field ${nullField || 'field'} cannot be null.`,
        );

      case 'P2014': // Invalid ID
        return ExceptionFactory.badRequest('Invalid record ID provided.');

      default:
        console.error('Unhandled Database Error Code:', e.code, e);
        return ExceptionFactory.internalServerError();
    }
  }
}
