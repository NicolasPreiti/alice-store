import { BadRequestException } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import {
  createZodSerializerInterceptor,
  createZodValidationPipe,
} from 'nestjs-zod';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Global zod validation pipe.
 *
 * A custom exception factory is required: nestjs-zod's default produces
 * `{ message: 'Validation failed', errors: [...] }`, which would break the
 * locked error shape `{ statusCode, message: string | string[] }`.
 * `strictSchemaDeclaration` stays off so `@CurrentUser()` and other
 * non-DTO params pass through untouched.
 */
const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    const issues =
      (error as { issues?: Array<{ path: Array<string | number>; message: string }> })
        ?.issues ?? [];
    return new BadRequestException(
      issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
    );
  },
});

const AppZodSerializerInterceptor = createZodSerializerInterceptor();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_PIPE, useClass: AppZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: AppZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
