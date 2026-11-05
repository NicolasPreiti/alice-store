import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * The error responses shared by every authenticated route.
 * Usage: `@ApiAuthErrors()` — one line instead of repeating the
 * 400 + 401 pair with the error DTO on each endpoint.
 */
export const ApiAuthErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: 'Validation failed',
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Missing, invalid, or expired credentials',
      type: ErrorResponseDto,
    }),
  );
