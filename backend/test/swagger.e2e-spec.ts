import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import {
  isSwaggerEnabled,
  setupSwagger,
} from '../src/config/swagger.config';

describe('Swagger (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    setupSwagger(app);
    await app.init();

    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves Swagger UI at /docs', async () => {
    const res = await http.get('/docs').expect(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger');
  });

  it('serves the OpenAPI document at /docs-json', async () => {
    const res = await http.get('/docs-json').expect(200);
    const doc = res.body as {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, Record<string, unknown>>;
      components: {
        securitySchemes: Record<string, unknown>;
        schemas: Record<string, { properties: Record<string, unknown> }>;
      };
    };

    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBe('Alice Store API');
    expect(doc.info.version).toBe('1.0');

    // Global prefix is part of the documented paths.
    expect(doc.paths['/api/auth/login']).toBeDefined();
    expect(doc.paths['/api/auth/me']).toBeDefined();

    // Bearer scheme for the Authorize button.
    expect(doc.components.securitySchemes['bearer']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });

    // nestjs-zod DTOs are inferred into components.schemas.
    expect(doc.components.schemas['CreateLoginDto']).toBeDefined();
    expect(doc.components.schemas['LoginResponseDto']).toBeDefined();
    expect(doc.components.schemas['MeResponseDto']).toBeDefined();
    expect(doc.components.schemas['ErrorResponseDto']).toBeDefined();

    const loginDto = doc.components.schemas['CreateLoginDto'];
    expect(loginDto.properties.email).toMatchObject({ type: 'string' });
    expect(loginDto.properties.password).toMatchObject({
      type: 'string',
      minLength: 1,
    });

    // Login request body references the DTO.
    const login = doc.paths['/api/auth/login']['post'] as {
      requestBody: {
        content: Record<string, { schema: { $ref: string } }>;
      };
    };
    expect(login.requestBody.content['application/json'].schema.$ref).toBe(
      '#/components/schemas/CreateLoginDto',
    );

    // me requires bearer auth; login does not.
    const me = doc.paths['/api/auth/me']['get'] as { security?: unknown };
    expect(me.security).toEqual([{ bearer: [] }]);
    const loginOp = doc.paths['/api/auth/login']['post'] as { security?: unknown };
    expect(loginOp.security).toBeUndefined();
  });

  it('documents 200/400/401 responses for login', async () => {
    const res = await http.get('/docs-json').expect(200);
    const login = res.body.paths['/api/auth/login']['post'] as {
      responses: Record<string, unknown>;
    };
    expect(login.responses['200']).toBeDefined();
    expect(login.responses['400']).toBeDefined();
    expect(login.responses['401']).toBeDefined();
  });

  describe('isSwaggerEnabled', () => {
    const fakeConfig = (values: Record<string, unknown>) =>
      ({
        get: (key: string) => values[key],
      }) as unknown as ConfigService;

    it('defaults to enabled outside production', () => {
      expect(isSwaggerEnabled(fakeConfig({ NODE_ENV: 'development' }))).toBe(true);
      expect(isSwaggerEnabled(fakeConfig({ NODE_ENV: 'test' }))).toBe(true);
    });

    it('defaults to disabled in production', () => {
      expect(isSwaggerEnabled(fakeConfig({ NODE_ENV: 'production' }))).toBe(false);
    });

    it('SWAGGER_ENABLED overrides NODE_ENV', () => {
      expect(
        isSwaggerEnabled(
          fakeConfig({ NODE_ENV: 'development', SWAGGER_ENABLED: false }),
        ),
      ).toBe(false);
      expect(
        isSwaggerEnabled(
          fakeConfig({ NODE_ENV: 'production', SWAGGER_ENABLED: true }),
        ),
      ).toBe(true);
    });
  });
});
