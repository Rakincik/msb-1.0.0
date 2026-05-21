import { Module } from '@nestjs/common';
import { ExamAreaService } from './exam-area.service';
import { ExamAreaController } from './exam-area.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ExamAreaController],
    providers: [ExamAreaService],
    exports: [ExamAreaService],
})
export class ExamAreaModule { }
