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
    UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExamAreaService } from './exam-area.service';
import { CreateExamAreaDto, UpdateExamAreaDto } from './dto/exam-area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Exam Areas')
@ApiBearerAuth()
@Controller('exam-areas')
@UseGuards(JwtAuthGuard)
export class ExamAreaController {
    constructor(private readonly examAreaService: ExamAreaService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni sınav alanı oluştur' })
    create(@Body() createExamAreaDto: CreateExamAreaDto, @TenantScope() tenantId: string | null) {
        if (tenantId) createExamAreaDto.tenantId = tenantId;
        return this.examAreaService.create(createExamAreaDto);
    }

    @Get()
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Tüm sınav alanlarını listele' })
    findAll(@Query('includeInactive') includeInactive?: string, @TenantScope() tenantId?: string | null) {
        return this.examAreaService.findAll(includeInactive === 'true', tenantId);
    }

    @Get('student/my-areas')
    @ApiOperation({ summary: 'Öğrencinin soru bankalarını listele' })
    findStudentAreas(@CurrentUser() user: any) {
        return this.examAreaService.findStudentAreas(user.id, user.role, user.tenantId);
    }

    @Get(':id')
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Sınav alanı detayı' })
    findOne(@Param('id') id: string) {
        return this.examAreaService.findOne(id);
    }

    @Get('slug/:slug')
    @UseInterceptors(CacheInterceptor)
    @ApiOperation({ summary: 'Slug ile sınav alanı bul' })
    findBySlug(@Param('slug') slug: string) {
        return this.examAreaService.findBySlug(slug);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanını güncelle' })
    update(@Param('id') id: string, @Body() updateExamAreaDto: UpdateExamAreaDto) {
        return this.examAreaService.update(id, updateExamAreaDto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanını sil' })
    remove(@Param('id') id: string) {
        return this.examAreaService.remove(id);
    }

    @Post(':id/lessons/:lessonId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanına ders ekle' })
    addLesson(@Param('id') id: string, @Param('lessonId') lessonId: string) {
        return this.examAreaService.addLesson(id, lessonId);
    }

    @Delete(':id/lessons/:lessonId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanından ders çıkar' })
    removeLesson(@Param('id') id: string, @Param('lessonId') lessonId: string) {
        return this.examAreaService.removeLesson(id, lessonId);
    }

    @Post('reorder')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanlarını yeniden sırala' })
    reorder(@Body() items: { id: string; order: number }[]) {
        return this.examAreaService.reorder(items);
    }

    @Post(':id/groups/:groupId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanına grup ekle' })
    addGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
        return this.examAreaService.addGroup(id, groupId);
    }

    @Delete(':id/groups/:groupId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanından grup çıkar' })
    removeGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
        return this.examAreaService.removeGroup(id, groupId);
    }

    @Post(':id/students/:studentId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanına öğrenci ekle' })
    addStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
        return this.examAreaService.addStudent(id, studentId);
    }

    @Delete(':id/students/:studentId')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Sınav alanından öğrenci çıkar' })
    removeStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
        return this.examAreaService.removeStudent(id, studentId);
    }
}
