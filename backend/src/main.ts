import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Helmet — HTTP security headers (XSS, Clickjacking, MIME sniffing koruması)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // uploads için gerekli
  }));

  // Body limits
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // CORS — env'den dinamik origin listesi
  const allowedOrigins = (configService.get('CORS_ORIGINS') || configService.get('FRONTEND_URL') || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000,http://127.0.0.1:3002')
    .split(',')
    .map((origin: string) => origin.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation — sadece development'ta
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Soru Bankası API')
      .setDescription('Sınav Yönetim Sistemi API Dokümantasyonu')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 API Docs: http://localhost:${configService.get('PORT') || 3001}/api/docs`);
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port);

  console.log(`🚀 Uygulama http://localhost:${port} adresinde çalışıyor [${nodeEnv}]`);
  console.log(`🔒 Helmet: aktif | 🛡️ Rate Limit: 100/dk`);
}
bootstrap();
