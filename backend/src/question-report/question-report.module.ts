import { Module } from '@nestjs/common';
import { QuestionReportService } from './question-report.service';
import { QuestionReportController } from './question-report.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionReportController],
  providers: [QuestionReportService],
})
export class QuestionReportModule {}
