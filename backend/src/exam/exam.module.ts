import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { QuestionModule } from '../question/question.module';

@Module({
    imports: [QuestionModule],
    controllers: [ExamController],
    providers: [ExamService],
    exports: [ExamService],
})
export class ExamModule { }
