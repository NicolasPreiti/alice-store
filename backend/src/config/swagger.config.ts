import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

/**
 * Swagger is enabled by default in every environment except `production`.
 * Set `SWAGGER_ENABLED=true|false` to override either way.
 */
export function isSwaggerEnabled(config: ConfigService): boolean {
  const explicit = config.get<boolean>("SWAGGER_ENABLED");
  if (explicit !== undefined) return explicit;
  return config.get<string>("NODE_ENV") !== "production";
}

/**
 * Builds the OpenAPI document and mounts Swagger UI at `/docs`
 * (machine-readable spec at `/docs-json`).
 *
 * Call after `app.setGlobalPrefix('api')` so document paths include the
 * prefix (`/api/auth/login`, …). Extracted from `main.ts` so tests can
 * mount it on their own app instance.
 *
 * Note: Swagger routes are registered directly on the HTTP adapter and
 * bypass Nest guards — gating via `isSwaggerEnabled` is the only
 * protection, which is why this must stay off in production.
 */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Alice Store API")
    .setDescription("Store CRM — products, sales, client debts, stats.")
    .setVersion("1.0")
    .addTag("auth", "Authentication")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Required post-processing for correct OpenAPI output from nestjs-zod DTOs.
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(document), {
    useGlobalPrefix: false,
    jsonDocumentUrl: "/docs-json",
    swaggerOptions: { persistAuthorization: true },
  });

  return document;
}
