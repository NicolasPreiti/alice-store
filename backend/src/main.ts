import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isSwaggerEnabled, setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  if (isSwaggerEnabled(config)) {
    setupSwagger(app);
  }

  await app.listen(config.get<number>('PORT') ?? 3000);
}
void bootstrap();
