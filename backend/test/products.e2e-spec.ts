import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { hash } from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

const PASSWORD = "e2e-pass-123";
const EMPLOYEE_EMAIL = "e2e-emp@test.local";
const CATEGORY_NAME = "e2e-Products-Category";
const SKU = "e2e-prod-001";

describe("Products (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let employeeToken: string;
  let categoryId: string;
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

    const category = await prisma.category.create({
      data: { name: CATEGORY_NAME },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sku: { startsWith: "e2e-" } } });
    await prisma.category.deleteMany({ where: { name: { startsWith: "e2e-" } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
    await app.close();
  });

  describe("POST /api/products", () => {
    it("creates a product with money as strings and an embedded category", async () => {
      const res = await http
        .post("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E Widget",
          sku: SKU,
          cost: 12.34,
          price: 20,
          description: "A widget",
          stock: 5,
          categoryId,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: "E2E Widget",
        sku: SKU,
        cost: "12.34",
        price: "20.00",
        description: "A widget",
        stock: 5,
        categoryId,
        category: { id: categoryId, name: CATEGORY_NAME },
        isActive: true,
      });
      expect(typeof res.body.cost).toBe("string");
      expect(typeof res.body.createdAt).toBe("string");
      expect(typeof res.body.updatedAt).toBe("string");
      createdId = res.body.id as string;
    });

    it("rejects a duplicate sku with 409", async () => {
      const res = await http
        .post("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E Dup",
          sku: SKU,
          cost: 1,
          price: 2,
          categoryId,
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it("rejects negative money with a 400 message array", async () => {
      const res = await http
        .post("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E Bad",
          sku: "e2e-bad",
          cost: -1,
          price: "not-a-number",
          categoryId,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it("rejects an unknown categoryId with 404", async () => {
      const res = await http
        .post("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E NoCat",
          sku: "e2e-nocat",
          cost: 1,
          price: 2,
          categoryId: "00000000-0000-0000-0000-000000000000",
        })
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: "Category not found",
      });
    });

    it("rejects unauthenticated requests with 401", async () => {
      await http
        .post("/api/products")
        .send({
          name: "E2E Anon",
          sku: "e2e-anon",
          cost: 1,
          price: 2,
          categoryId,
        })
        .expect(401);
    });
  });

  describe("GET /api/products", () => {
    it("lists products as EMPLOYEE (not 403) with embedded categories", async () => {
      const res = await http
        .get("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const created = res.body.find((p: { sku: string }) => p.sku === SKU);
      expect(created).toBeDefined();
      expect(created.category).toEqual({ id: categoryId, name: CATEGORY_NAME });
      expect(typeof created.cost).toBe("string");
    });

    it("returns a single product", async () => {
      const res = await http
        .get(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.sku).toBe(SKU);
      expect(res.body.category.name).toBe(CATEGORY_NAME);
    });

    it("returns 404 for an unknown id", async () => {
      const res = await http
        .get("/api/products/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: "Product not found",
      });
    });
  });

  describe("PATCH /api/products/:id", () => {
    it("updates stock and price", async () => {
      const res = await http
        .patch(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ stock: 42, price: 25.5 })
        .expect(200);

      expect(res.body.stock).toBe(42);
      expect(res.body.price).toBe("25.50");
    });

    it("rejects an unknown categoryId with 404", async () => {
      const res = await http
        .patch(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ categoryId: "00000000-0000-0000-0000-000000000000" })
        .expect(404);

      expect(res.body).toEqual({
        statusCode: 404,
        message: "Category not found",
      });
    });

    it("rejects rename to an existing sku with 409", async () => {
      await http
        .post("/api/products")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          name: "E2E Other",
          sku: "e2e-other",
          cost: 1,
          price: 2,
          categoryId,
        })
        .expect(201);

      const res = await http
        .patch(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ sku: "e2e-other" })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it("deactivates but still returns the product", async () => {
      const res = await http
        .patch(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);

      const one = await http
        .get(`/api/products/${createdId}`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .expect(200);
      expect(one.body.isActive).toBe(false);
    });
  });
});
