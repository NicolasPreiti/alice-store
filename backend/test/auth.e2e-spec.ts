import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'e2e-pass-123';
const ADMIN_EMAIL = 'e2e-admin@test.local';
const INACTIVE_EMAIL = 'e2e-inactive@test.local';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
    const passwordHash = await hash(PASSWORD, 10);
    await prisma.user.createMany({
      data: [
        {
          name: 'E2E Admin',
          email: ADMIN_EMAIL,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
        {
          name: 'E2E Inactive',
          email: INACTIVE_EMAIL,
          passwordHash,
          role: 'EMPLOYEE',
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('returns a token and a sanitized user for valid credentials', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: PASSWORD })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken).not.toBe('');
      expect(res.body.user).toMatchObject({
        email: ADMIN_EMAIL,
        role: 'ADMIN',
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('normalizes the email casing and whitespace', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: `  ${ADMIN_EMAIL.toUpperCase()}  `, password: PASSWORD })
        .expect(200);

      expect(res.body.user.email).toBe(ADMIN_EMAIL);
    });

    it('rejects a wrong password with 401', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'wrong-password' })
        .expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('rejects an unknown email with 401', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: 'nobody@test.local', password: PASSWORD })
        .expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('rejects an inactive user with 401', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: INACTIVE_EMAIL, password: PASSWORD })
        .expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        message: 'User is inactive',
      });
    });

    it('returns 400 with a message array for an invalid body', async () => {
      const res = await http.post('/api/auth/login').send({}).expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message).toHaveLength(2);
      expect(res.body.message.join(' ')).toContain('email');
      expect(res.body.message.join(' ')).toContain('password');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: PASSWORD })
        .expect(200);
      accessToken = res.body.accessToken as string;
    });

    it('returns the current user without the password hash', async () => {
      const res = await http
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        isActive: true,
      });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(typeof res.body.createdAt).toBe('string');
    });

    it('rejects a request without a token with 401', async () => {
      const res = await http.get('/api/auth/me').expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('rejects a garbage token with 401', async () => {
      const res = await http
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });
});
