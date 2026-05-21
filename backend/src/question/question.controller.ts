import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { CreateQuestionDto, UpdateQuestionDto, QuestionFilterDto, RandomQuestionsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role, DifficultyLevel, QuestionType } from '@prisma/client';

@ApiTags('Questions')
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuestionController {
    constructor(private readonly questionService: QuestionService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni soru oluştur' })
    create(@Body() dto: CreateQuestionDto, @CurrentUser('id') userId: string, @TenantScope() tenantId: string | null) {
        if (tenantId) dto.tenantId = tenantId;
        return this.questionService.create(dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Soruları listele' })
    @ApiQuery({ name: 'topicId', required: false })
    @ApiQuery({ name: 'unitId', required: false })
    @ApiQuery({ name: 'lessonId', required: false })
    @ApiQuery({ name: 'learningOutcomeId', required: false })
    @ApiQuery({ name: 'difficulty', required: false, enum: DifficultyLevel })
    @ApiQuery({ name: 'type', required: false, enum: QuestionType })
    @ApiQuery({ name: 'createdById', required: false })
    @ApiQuery({ name: 'examAreaId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false, description: 'createdAt | difficulty | usageCount' })
    @ApiQuery({ name: 'sortOrder', required: false, description: 'asc | desc' })
    @ApiQuery({ name: 'hasImage', required: false, type: Boolean })
    @ApiQuery({ name: 'hasVideo', required: false, type: Boolean })
    @ApiQuery({ name: 'isPastQuestion', required: false, type: Boolean })
    findAll(
        @Query('topicId') topicId?: string,
        @Query('unitId') unitId?: string,
        @Query('lessonId') lessonId?: string,
        @Query('learningOutcomeId') learningOutcomeId?: string,
        @Query('difficulty') difficulty?: DifficultyLevel,
        @Query('type') type?: QuestionType,
        @Query('createdById') createdById?: string,
        @Query('search') search?: string,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('examAreaId') examAreaId?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: string,
        @Query('hasImage') hasImage?: string,
        @Query('hasVideo') hasVideo?: string,
        @Query('isPastQuestion') isPastQuestion?: string,
        @TenantScope() tenantScope?: string | null,
    ) {
        return this.questionService.findAll({
            topicId,
            unitId,
            lessonId,
            learningOutcomeId,
            difficulty,
            type,
            createdById,
            examAreaId,
            search,
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
            hasImage: hasImage === 'true' ? true : hasImage === 'false' ? false : undefined,
            hasVideo: hasVideo === 'true' ? true : hasVideo === 'false' ? false : undefined,
            isPastQuestion: isPastQuestion === 'true' ? true : isPastQuestion === 'false' ? false : undefined,
        }, tenantScope);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Soru istatistikleri' })
    @ApiQuery({ name: 'topicIds', required: false, type: [String] })
    getStats(@Query('topicIds') topicIds?: string[]) {
        return this.questionService.getQuestionStats(topicIds);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Soru detayı' })
    findOne(@Param('id') id: string) {
        return this.questionService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soru güncelle' })
    update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
        return this.questionService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soru sil' })
    remove(@Param('id') id: string) {
        return this.questionService.remove(id);
    }

    @Patch(':id/deactivate')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soruyu devre dışı bırak' })
    deactivate(@Param('id') id: string) {
        return this.questionService.deactivate(id);
    }

    @Post('random')
    @ApiOperation({ summary: 'Rastgele sorular getir (Kendin Oluştur için)' })
    getRandomQuestions(@Body() dto: RandomQuestionsDto) {
        return this.questionService.getRandomQuestions(dto);
    }

    @Post('bulk')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Toplu soru oluştur (Excel/CSV import)' })
    bulkCreate(
        @Body() questions: CreateQuestionDto[],
        @CurrentUser('id') userId: string,
    ) {
        return this.questionService.bulkCreate(questions, userId);
    }

    @Post('bulk-add-to-exam-area')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Seçili soruları Soru Bankalarına ekle' })
    bulkAddToExamArea(
        @Body() body: { questionIds: string[]; examAreaIds: string[] },
    ) {
        return this.questionService.bulkAddToExamAreas(body.questionIds, body.examAreaIds);
    }
}
