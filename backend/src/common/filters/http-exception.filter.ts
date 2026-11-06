import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { Prisma } from '../../../generated/prisma/client';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toErrorBody(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { statusCode, message: payload };
      }
      const message = (payload as { message?: unknown }).message;
      return {
        statusCode,
        message:
          typeof message === 'string' || Array.isArray(message)
            ? (message as string | string[])
            : exception.message,
      };
    }

    if (exception instanceof ZodSerializationException) {
      // Response does not match its @ZodSerializerDto schema — server bug,
      // never leak the detail to the client.
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.issues.map(
          (i) => `${i.path.join('.') || 'body'}: ${i.message}`,
        ),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'Unique constraint violation',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Resource not found',
          };
        default:
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
