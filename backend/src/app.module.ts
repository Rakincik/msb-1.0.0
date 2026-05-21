import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TenantModule } from './tenant/tenant.module';
import { ContentModule } from './content/content.module';
import { QuestionModule } from './question/question.module';
import { ExamModule } from './exam/exam.module';
import { PdfModule } from './pdf/pdf.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UploadModule } from './upload/upload.module';
import { GroupModule } from './group/group.module';
import { ExamAreaModule } from './exam-area/exam-area.module';
import { QuestionProgressModule } from './question-progress/question-progress.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { QuestionReportModule } from './question-report/question-report.module';
import { SelfTestModule } from './self-test/self-test.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 1 dakika boyunca cache'te tut
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 dakika
      limit: 100,  // Genel: 100 req/dk
    }]),
    PrismaModule,
    AuthModule,
    UserModule,
    TenantModule,
    ContentModule,
    QuestionModule,
    ExamModule,
    PdfModule,
    AnalyticsModule,
    UploadModule,
    GroupModule,
    ExamAreaModule,
    QuestionProgressModule,
    QuestionReportModule,
    SelfTestModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule { }
