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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
    CreateLessonDto,
    UpdateLessonDto,
    CreateUnitDto,
    UpdateUnitDto,
    CreateTopicDto,
    UpdateTopicDto,
    CreateLearningOutcomeDto,
    UpdateLearningOutcomeDto,
    BulkImportItemDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role } from '@prisma/client';

@ApiTags('Content')
@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContentController {
    constructor(private readonly contentService: ContentService) { }

    // ==================== DERSLER ====================

    @Post('lessons')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni ders oluştur' })
    createLesson(@Body() dto: CreateLessonDto, @TenantScope() tenantId: string | null) {
        if (tenantId) dto.tenantId = tenantId;
        return this.contentService.createLesson(dto);
    }

    @Get('lessons')
    @ApiOperation({ summary: 'Dersleri listele' })
    findAllLessons(@CurrentUser('tenantId') tenantId?: string) {
        return this.contentService.findAllLessons(tenantId);
    }

    @Get('lessons/:id')
    @ApiOperation({ summary: 'Ders detayı' })
    findOneLesson(@Param('id') id: string) {
        return this.contentService.findOneLesson(id);
    }

    @Patch('lessons/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Ders güncelle' })
    updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
        return this.contentService.updateLesson(id, dto);
    }

    @Delete('lessons/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Ders sil' })
    removeLesson(@Param('id') id: string) {
        return this.contentService.removeLesson(id);
    }

    // ==================== ÜNİTELER ====================

    @Post('units')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni ünite oluştur' })
    createUnit(@Body() dto: CreateUnitDto) {
        return this.contentService.createUnit(dto);
    }

    @Get('units')
    @ApiOperation({ summary: 'Üniteleri listele' })
    findAllUnits(@Query('lessonId') lessonId: string) {
        return this.contentService.findAllUnits(lessonId);
    }

    @Get('units/:id')
    @ApiOperation({ summary: 'Ünite detayı' })
    findOneUnit(@Param('id') id: string) {
        return this.contentService.findOneUnit(id);
    }

    @Patch('units/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Ünite güncelle' })
    updateUnit(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
        return this.contentService.updateUnit(id, dto);
    }

    @Delete('units/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Ünite sil' })
    removeUnit(@Param('id') id: string) {
        return this.contentService.removeUnit(id);
    }

    // ==================== KONULAR ====================

    @Post('topics')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni konu oluştur' })
    createTopic(@Body() dto: CreateTopicDto) {
        return this.contentService.createTopic(dto);
    }

    @Get('topics')
    @ApiOperation({ summary: 'Konuları listele' })
    findAllTopics(@Query('unitId') unitId: string) {
        return this.contentService.findAllTopics(unitId);
    }

    @Get('topics/:id')
    @ApiOperation({ summary: 'Konu detayı' })
    findOneTopic(@Param('id') id: string) {
        return this.contentService.findOneTopic(id);
    }

    @Patch('topics/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Konu güncelle' })
    updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
        return this.contentService.updateTopic(id, dto);
    }

    @Delete('topics/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Konu sil' })
    removeTopic(@Param('id') id: string) {
        return this.contentService.removeTopic(id);
    }

    // ==================== KAZANIMLAR ====================

    @Post('learning-outcomes')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni kazanım oluştur' })
    createLearningOutcome(@Body() dto: CreateLearningOutcomeDto) {
        return this.contentService.createLearningOutcome(dto);
    }

    @Get('learning-outcomes')
    @ApiOperation({ summary: 'Kazanımları listele' })
    findAllLearningOutcomes(
        @Query('topicId') topicId?: string,
        @Query('lessonId') lessonId?: string,
    ) {
        return this.contentService.findAllLearningOutcomes(topicId, lessonId);
    }

    @Patch('learning-outcomes/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kazanım güncelle' })
    updateLearningOutcome(@Param('id') id: string, @Body() dto: UpdateLearningOutcomeDto) {
        return this.contentService.updateLearningOutcome(id, dto);
    }

    @Delete('learning-outcomes/:id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kazanım sil' })
    removeLearningOutcome(@Param('id') id: string) {
        return this.contentService.removeLearningOutcome(id);
    }

    // ==================== AĞAÇ GÖRÜNÜMÜ ====================

    @Get('tree')
    @ApiOperation({ summary: 'İçerik ağacı (Ders > Ünite > Konu)' })
    getContentTree(@CurrentUser('tenantId') tenantId?: string) {
        return this.contentService.getContentTree(tenantId);
    }

    @Post('lessons/:lessonId/bulk-import')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Seçili derse Excel/CSV ile ünite ve konu yükle' })
    bulkImportToLesson(
        @Param('lessonId') lessonId: string,
        @Body() items: BulkImportItemDto[]
    ) {
        return this.contentService.bulkImportToLesson(lessonId, items);
    }
}
