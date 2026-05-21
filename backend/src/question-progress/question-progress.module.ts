import { Module } from '@nestjs/common';
import { QuestionProgressService } from './question-progress.service';
import { QuestionProgressController } from './question-progress.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [QuestionProgressController],
    providers: [QuestionProgressService],
    exports: [QuestionProgressService],
})
export class QuestionProgressModule { }
