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
import { ExamService } from './exam.service';
import { CreateExamDto, UpdateExamDto, SubmitExamDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role, ExamType, ExamStatus } from '@prisma/client';

@ApiTags('Exams')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExamController {
    constructor(private readonly examService: ExamService) { }

    // ==================== SINAV YÖNETİMİ ====================

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni sınav oluştur' })
    create(@Body() dto: CreateExamDto) {
        return this.examService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Sınavları listele' })
    @ApiQuery({ name: 'tenantId', required: false })
    @ApiQuery({ name: 'type', required: false, enum: ExamType })
    @ApiQuery({ name: 'status', required: false, enum: ExamStatus })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    findAll(
        @Query('tenantId') tenantId?: string,
        @Query('type') type?: ExamType,
        @Query('status') status?: ExamStatus,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @CurrentUser() user?: any,
    ) {
        // Admin olmayan kullanıcılar sadece kendi tenant'larını görebilir
        if (user?.role !== Role.SUPER_ADMIN && user?.tenantId) {
            tenantId = user.tenantId;
        }

        return this.examService.findAll({
            tenantId,
            type,
            status,
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Sınav detayı' })
    async findOne(@Param('id') id: string, @TenantScope() tenantScope?: string | null) {
        return this.examService.findOne(id, tenantScope);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav güncelle' })
    update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
        return this.examService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Sınav sil' })
    remove(@Param('id') id: string) {
        return this.examService.remove(id);
    }

    @Patch(':id/status/:status')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav durumunu güncelle' })
    updateStatus(@Param('id') id: string, @Param('status') status: ExamStatus) {
        return this.examService.updateStatus(id, status);
    }

    // ==================== ÖĞRENCİ İŞLEMLERİ ====================

    @Post(':id/start')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Sınava başla' })
    startExam(@Param('id') examId: string, @CurrentUser('id') userId: string) {
        return this.examService.startExam(examId, userId);
    }

    @Post('submit')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Sınavı teslim et' })
    submitExam(@Body() dto: SubmitExamDto, @CurrentUser('id') userId: string) {
        return this.examService.submitExam(dto, userId);
    }

    @Get(':id/my-result')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendi sınav sonucumu getir' })
    getMyResult(@Param('id') examId: string, @CurrentUser('id') userId: string) {
        return this.examService.getMyResult(examId, userId);
    }

    // ==================== LEADERBOARD ====================

    @Get(':id/leaderboard')
    @ApiOperation({ summary: 'Sınav sıralaması' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getLeaderboard(@Param('id') examId: string, @Query('limit') limit?: number) {
        return this.examService.getLeaderboard(examId, limit ? Number(limit) : 100);
    }

    @Post(':id/calculate-rankings')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Sıralamaları hesapla' })
    calculateRankings(@Param('id') examId: string) {
        return this.examService.calculateRankings(examId);
    }

    // ==================== KENDİN OLUŞTUR ====================

    @Post('self-test/create')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendin oluştur - Test oluştur' })
    createSelfTest(
        @CurrentUser('id') userId: string,
        @Body() body: { topicIds: string[]; questionCount: number },
    ) {
        return this.examService.createSelfTest(userId, body.topicIds, body.questionCount);
    }

    @Post('self-test/submit')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendin oluştur - Test teslim' })
    submitSelfTest(
        @CurrentUser('id') userId: string,
        @Body() body: { answers: Record<string, string>; questionIds: string[] },
    ) {
        return this.examService.submitSelfTest(userId, body.answers, body.questionIds);
    }
}
