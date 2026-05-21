import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ==================== DASHBOARD ====================

    @Get('dashboard')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Admin dashboard istatistikleri' })
    getDashboardStats(@TenantScope() tenantScope: string | null) {
        return this.analyticsService.getDashboardStats(tenantScope);
    }

    @Get('dashboard/activity')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Son aktiviteler feed' })
    getRecentActivity(@TenantScope() tenantScope: string | null) {
        return this.analyticsService.getRecentActivity(tenantScope);
    }

    // ==================== ÖĞRENCİ RAPORLARI ====================

    @Get('student/report')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendi karnemi getir' })
    getMyReport(@CurrentUser('id') userId: string) {
        return this.analyticsService.getStudentReport(userId);
    }

    @Get('student/:userId/report')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Öğrenci karnesi getir' })
    getStudentReport(@Param('userId') userId: string) {
        return this.analyticsService.getStudentReport(userId);
    }

    @Get('student/topics')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendi konu analizim' })
    @ApiQuery({ name: 'lessonId', required: false })
    getMyTopicAnalysis(
        @CurrentUser('id') userId: string,
        @Query('lessonId') lessonId?: string,
    ) {
        return this.analyticsService.getTopicAnalysis(userId, lessonId);
    }

    @Get('student/:userId/topics')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Öğrenci konu analizi' })
    @ApiQuery({ name: 'lessonId', required: false })
    getStudentTopicAnalysis(
        @Param('userId') userId: string,
        @Query('lessonId') lessonId?: string,
    ) {
        return this.analyticsService.getTopicAnalysis(userId, lessonId);
    }

    @Get('student/progress')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Kendi gelişim grafiğim' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getMyProgress(
        @CurrentUser('id') userId: string,
        @Query('limit') limit?: number,
    ) {
        return this.analyticsService.getProgressChart(userId, limit ? Number(limit) : 20);
    }

    @Get('student/:userId/progress')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Öğrenci gelişim grafiği' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    getStudentProgress(
        @Param('userId') userId: string,
        @Query('limit') limit?: number,
    ) {
        return this.analyticsService.getProgressChart(userId, limit ? Number(limit) : 20);
    }

    // ==================== KURUM RAPORLARI ====================

    @Get('tenant/:tenantId')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Kurum raporu' })
    getTenantReport(@Param('tenantId') tenantId: string) {
        return this.analyticsService.getTenantReport(tenantId);
    }

    @Get('tenant/my-report')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Kendi kurumum raporu' })
    getMyTenantReport(@CurrentUser('tenantId') tenantId: string) {
        return this.analyticsService.getTenantReport(tenantId);
    }

    @Get('class/:classId')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınıf raporu' })
    getClassReport(@Param('classId') classId: string) {
        return this.analyticsService.getClassReport(classId);
    }

    // ==================== SORU BANKASI ANALİTİKLERİ ====================

    @Get('question-bank')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soru bankası analitikleri' })
    getQuestionBankAnalytics() {
        return this.analyticsService.getQuestionBankAnalytics();
    }

    // ==================== ÖĞRENCİ PRATİK İSTATİSTİKLERİ ====================

    @Get('my-practice-stats')
    @ApiOperation({ summary: 'Öğrencinin kendi pratik istatistikleri' })
    getMyPracticeStats(@CurrentUser('id') userId: string) {
        return this.analyticsService.getStudentPracticeStats(userId);
    }
}

