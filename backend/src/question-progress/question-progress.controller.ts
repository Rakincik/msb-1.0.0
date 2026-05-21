import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { QuestionProgressService } from './question-progress.service';
import { SaveProgressDto } from './dto/save-progress.dto';

@ApiTags('Question Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('question-progress')
export class QuestionProgressController {
    constructor(private readonly progressService: QuestionProgressService) { }

    @Post()
    @ApiOperation({ summary: 'Soru çözümünü kaydet' })
    saveProgress(@CurrentUser() user: User, @Body() dto: SaveProgressDto) {
        return this.progressService.saveProgress(user.id, dto);
    }

    @Get('by-topic')
    @ApiOperation({ summary: 'Konuya ait çözülmüş soruları getir' })
    getProgressByTopic(@CurrentUser() user: User, @Query('topicId') topicId: string) {
        return this.progressService.getProgressByTopic(user.id, topicId);
    }

    @Get('by-lesson')
    @ApiOperation({ summary: 'Derse ait çözülmüş soruları getir' })
    getProgressByLesson(@CurrentUser() user: User, @Query('lessonId') lessonId: string) {
        return this.progressService.getProgressByLesson(user.id, lessonId);
    }
}
