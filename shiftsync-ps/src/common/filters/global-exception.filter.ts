import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { CustomException, ExceptionCode } from '../../utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let details: any = undefined;

    // Log error with request context
    console.error('Global Exception Caught:', {
      error: e,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // Handle our custom exceptions
    if (e instanceof CustomException) {
      const errorResponse = e.toJSON();
      return response.status(errorResponse.status).json({
        success: false,
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // Handle NestJS HTTP exceptions
    if (e instanceof HttpException) {
      status = e.getStatus();
      const exceptionResponse = e.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || 'Bad Request';

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          message = 'Input data validation failed';
          details = responseObj.message;
        }
      }

      code = this.mapHttpStatusToCode(status);
    }

    // Handle validation errors from class-validator
    if (e && typeof e === 'object' && 'response' in e && 'status' in e) {
      const validationError = e as any;
      if (validationError.status === 400 && validationError.response?.message) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid request parameter(s) provided, check your input and try again';
        code = ExceptionCode.BAD_REQUEST;
        details = validationError.response.message;
      }
    }

    // Handle JavaScript errors
    if (e instanceof Error && !(e instanceof HttpException) && !(e instanceof CustomException)) {
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : e.message;

      code = ExceptionCode.INTERNAL_SERVER_ERROR;

      if (process.env.NODE_ENV === 'development') {
        details = { stack: e.stack };
      }
    }

    const errorResponse: any = {
      success: false,
      status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (code) errorResponse.code = code;
    if (details) errorResponse.details = details;

    response.status(status).json(errorResponse);
  }

  private mapHttpStatusToCode(status: number): string | undefined {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ExceptionCode.BAD_REQUEST;
      case HttpStatus.FORBIDDEN:
        return ExceptionCode.ACCESS_DENIED;
      case HttpStatus.NOT_FOUND:
        return ExceptionCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ExceptionCode.RECORD_CONFLICT;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ExceptionCode.INTERNAL_SERVER_ERROR;
      default:
        return undefined;
    }
  }
}
