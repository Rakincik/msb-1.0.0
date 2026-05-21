import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionReportService } from './question-report.service';
import { CreateQuestionReportDto, UpdateQuestionReportStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Question Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('question-reports')
export class QuestionReportController {
    constructor(private readonly questionReportService: QuestionReportService) {}

    @Post()
    @ApiOperation({ summary: 'Öğrenci tarafından hatalı soru bildirimi oluşturur' })
    create(@Body() dto: CreateQuestionReportDto, @CurrentUser() user: any) {
        return this.questionReportService.create(user.id, user.tenantId, dto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Tüm soru bildirimlerini listeler (Admin/Öğretmen)' })
    findAll(@CurrentUser() user: any) {
        const tenantScope = user.role === Role.SUPER_ADMIN ? null : user.tenantId;
        return this.questionReportService.findAll(tenantScope);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soru bildirimi durumunu günceller (Çözüldü vb.)' })
    updateStatus(
        @Param('id') id: string, 
        @Body() dto: UpdateQuestionReportStatusDto,
        @CurrentUser() user: any
    ) {
        const tenantScope = user.role === Role.SUPER_ADMIN ? null : user.tenantId;
        return this.questionReportService.updateStatus(id, dto, tenantScope);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Soru bildirimini siler' })
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        const tenantScope = user.role === Role.SUPER_ADMIN ? null : user.tenantId;
        return this.questionReportService.remove(id, tenantScope);
    }
}
