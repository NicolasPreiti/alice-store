import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Prisma } from "../generated/prisma/client";
import { hash } from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "e2e-pass-123";
const EMPLOYEE_EMAIL = "e2e-emp@test.local";
const CREATED = "e2e-Beverages";

describe("Categories (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
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

    // Clean up previous run's fixtures.
    await prisma.product.deleteMany({ where: { sku: { startsWith: "e2e-" } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: "e2e-" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });

    const passwordHash = await hash(PASSWORD, 10);
    await prisma.user.createMany({
      data: [
        {
          name: "E2E Employee",
          email: EMPLOYEE_EMAIL,
          passwordHash,
          role: "EMPLOYEE",
          isActive: true,
        },
      ],
    });
    employeeToken = await login(EMPLOYEE_EMAIL, PASSWORD);
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sku: { startsWith: "e2e-" } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: "e2e-" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
    await app.close();
  });

  describe("POST /api/categories", () => {
    it("creates a category (201) with no extra fields", async () => {
      const res = await http
        .post("/api/categories")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: `  ${CREATED}  ` })
        .expect(201);

      expect(res.body).toEqual({ id: expect.any(String), name: CREATED });
      createdId = res.body.id as string;
    });

    it("rejects a duplicate name with 409", async () => {
      const res = await http
        .post("/api/categories")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: CREATED })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it("returns 400 with a message array for an empty name", async () => {
      const res = await http
        .post("/api/categories")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: "   " })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it("rejects unauthenticated requests with 401", async () => {
      await http.post("/api/categories").send({ name: "e2e-Anon" }).expect(401);
    });
  });

  describe("GET /api/categories", () => {
    it("lists categories as EMPLOYEE (not 403)", async () => {
      const res = await http
        .get("/api/categories")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: { name: string }) => c.name === CREATED)).toBe(true);
    });
  });

  describe("GET /api/categories/:id", () => {
    it("returns a single category", async () => {
      const res = await http
        .get(`/api/categories/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toEqual({ id: createdId, name: CREATED });
    });

    it("returns 404 for an unknown id", async () => {
      const res = await http
        .get("/api/categories/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: "Category not found",
      });
    });
  });

  describe("PATCH /api/categories/:id", () => {
    it("renames a category", async () => {
      const res = await http
        .patch(`/api/categories/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: "e2e-Beverages-Renamed" })
        .expect(200);

      expect(res.body).toEqual({ id: createdId, name: "e2e-Beverages-Renamed" });
    });

    it("rejects rename to an existing name with 409", async () => {
      const other = await prisma.category.create({
        data: { name: "e2e-Occupied" },
      });
      const res = await http
        .patch(`/api/categories/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ name: "e2e-Occupied" })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      await prisma.category.delete({ where: { id: other.id } });
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("rejects deleting a category that has products with 400", async () => {
      const blocker = await prisma.category.create({
        data: { name: "e2e-Blocked" },
      });
      await prisma.product.create({
        data: {
          name: "E2E Product",
          sku: "e2e-blocker-sku",
          cost: new Prisma.Decimal("1.00"),
          price: new Prisma.Decimal("2.00"),
          categoryId: blocker.id,
        },
      });

      const res = await http
        .delete(`/api/categories/${blocker.id}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(400);

      expect(res.body).toEqual({
        statusCode: 400,
        message: "Category has products",
      });

      await prisma.product.deleteMany({ where: { sku: "e2e-blocker-sku" } });
      await prisma.category.delete({ where: { id: blocker.id } });
    });

    it("deletes an empty category", async () => {
      const res = await http
        .delete(`/api/categories/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toEqual({ id: createdId, name: "e2e-Beverages-Renamed" });

      await http
        .get(`/api/categories/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(404);
    });
  });
});
