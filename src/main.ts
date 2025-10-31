import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', '..', 'public'));
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 API Gateway is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`🎥 Video Platform frontend: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
