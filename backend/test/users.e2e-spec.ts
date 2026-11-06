import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { hash } from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "e2e-pass-123";
const ADMIN_EMAIL = "e2e-admin@test.local";
const EMPLOYEE_EMAIL = "e2e-emp@test.local";
const CREATED_EMAIL = "e2e-created@test.local";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let adminToken: string;
  let employeeToken: string;
  let createdId: string;

  async function login(email: string, password: string): Promise<string> {
    const res = await http
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();

    prisma = app.get(PrismaService);
    http = request(app.getHttpServer());

    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
    const passwordHash = await hash(PASSWORD, 10);
    await prisma.user.createMany({
      data: [
        {
          name: "E2E Admin",
          email: ADMIN_EMAIL,
          passwordHash,
          role: "ADMIN",
          isActive: true,
        },
        {
          name: "E2E Employee",
          email: EMPLOYEE_EMAIL,
          passwordHash,
          role: "EMPLOYEE",
          isActive: true,
        },
      ],
    });

    adminToken = await login(ADMIN_EMAIL, PASSWORD);
    employeeToken = await login(EMPLOYEE_EMAIL, PASSWORD);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
    await app.close();
  });

  describe("POST /api/users", () => {
    it("creates a user without leaking passwordHash", async () => {
      const res = await http
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "E2E Created",
          email: CREATED_EMAIL,
          password: "password123",
          role: "EMPLOYEE",
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: "E2E Created",
        email: CREATED_EMAIL,
        role: "EMPLOYEE",
        isActive: true,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body).not.toHaveProperty("passwordHash");
      createdId = res.body.id as string;
    });

    it("rejects a duplicate email with 409", async () => {
      const res = await http
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "E2E Dup",
          email: CREATED_EMAIL,
          password: "password123",
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it("returns 400 with a message array for an invalid body", async () => {
      const res = await http
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "", email: "not-an-email", password: "short" })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it("rejects an EMPLOYEE with 403", async () => {
      await http
        .post("/api/users")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E Forbidden",
          email: "e2e-forbidden@test.local",
          password: "password123",
        })
        .expect(403);
    });

    it("rejects unauthenticated requests with 401", async () => {
      await http
        .post("/api/users")
        .send({
          name: "E2E Anon",
          email: "e2e-anon@test.local",
          password: "password123",
        })
        .expect(401);
    });
  });

  describe("GET /api/users", () => {
    it("lists users as ADMIN", async () => {
      const res = await http
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const created = res.body.find((u: { email: string }) => u.email === CREATED_EMAIL);
      expect(created).toBeDefined();
      for (const u of res.body) {
        expect(u).not.toHaveProperty("passwordHash");
      }
    });

    it("rejects an EMPLOYEE with 403", async () => {
      await http
        .get("/api/users")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns a single user", async () => {
      const res = await http
        .get(`/api/users/${createdId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.email).toBe(CREATED_EMAIL);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("returns 404 for an unknown id", async () => {
      const res = await http
        .get("/api/users/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toEqual({ statusCode: 404, message: "User not found" });
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("updates name and role", async () => {
      const res = await http
        .patch(`/api/users/${createdId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "E2E Renamed", role: "ADMIN" })
        .expect(200);

      expect(res.body).toMatchObject({ name: "E2E Renamed", role: "ADMIN" });
    });

    it("rejects self-deactivation with 400", async () => {
      const me = await http
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const res = await http
        .patch(`/api/users/${me.body.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: "Cannot deactivate your own account",
      });
    });

    it("rejects removing the last active admin via role downgrade with 400", async () => {
      // Revert the created user to EMPLOYEE first so the only remaining
      // active ADMIN is the caller, then try to downgrade self.
      await http
        .patch(`/api/users/${createdId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "EMPLOYEE" })
        .expect(200);

      const me = await http
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const res = await http
        .patch(`/api/users/${me.body.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "EMPLOYEE" })
        .expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: "Cannot remove the last active admin",
      });
    });
  });

  describe("POST /api/users/:id/reset-password", () => {
    it("resets the password; new password logs in, old does not", async () => {
      await http
        .post(`/api/users/${createdId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ password: "newpassword123" })
        .expect(200);

      // New password works.
      await http
        .post("/api/auth/login")
        .send({ email: CREATED_EMAIL, password: "newpassword123" })
        .expect(200);

      // Old password no longer works.
      await http
        .post("/api/auth/login")
        .send({ email: CREATED_EMAIL, password: "password123" })
        .expect(401);
    });

    it("returns 404 for an unknown id", async () => {
      const res = await http
        .post("/api/users/00000000-0000-0000-0000-000000000000/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ password: "newpassword123" })
        .expect(404);

      expect(res.body).toEqual({ statusCode: 404, message: "User not found" });
    });
  });
});
