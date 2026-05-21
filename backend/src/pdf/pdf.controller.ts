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
import { PdfService } from './pdf.service';
import { CreatePdfDocumentDto, UpdatePdfDocumentDto, SaveAnnotationDto, SetAnswerKeyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScope } from '../common/decorators/tenant-scope.decorator';
import { Role } from '@prisma/client';

@ApiTags('PDF')
@Controller('pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PdfController {
    constructor(private readonly pdfService: PdfService) { }

    // ==================== DOKÜMAN YÖNETİMİ ====================

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni PDF doküman oluştur' })
    create(@Body() dto: CreatePdfDocumentDto, @CurrentUser('id') userId: string, @TenantScope() tenantId: string | null) {
        if (tenantId) dto.tenantId = tenantId;
        return this.pdfService.create(dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'PDF dokümanları listele' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    findAll(
        @Query('search') search?: string,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
    ) {
        return this.pdfService.findAll({
            search,
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'PDF doküman detayı' })
    findOne(@Param('id') id: string) {
        return this.pdfService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'PDF doküman güncelle' })
    update(@Param('id') id: string, @Body() dto: UpdatePdfDocumentDto) {
        return this.pdfService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'PDF doküman sil' })
    remove(@Param('id') id: string) {
        return this.pdfService.remove(id);
    }

    @Post(':id/answer-key')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Cevap anahtarı gir' })
    setAnswerKey(@Param('id') id: string, @Body() dto: SetAnswerKeyDto) {
        return this.pdfService.setAnswerKey(id, dto.answerKey);
    }

    // ==================== ANNOTATION (ÇİZİM) ====================

    @Post('annotations')
    @ApiOperation({ summary: 'Çizim kaydet' })
    saveAnnotation(
        @Body() dto: SaveAnnotationDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.pdfService.saveAnnotation(dto, userId);
    }

    @Get(':id/annotations')
    @ApiOperation({ summary: 'Kullanıcının tüm çizimlerini getir' })
    getAnnotations(
        @Param('id') pdfDocumentId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.pdfService.getAnnotations(pdfDocumentId, userId);
    }

    @Get(':id/annotations/:pageNumber')
    @ApiOperation({ summary: 'Belirli sayfa çizimini getir' })
    getAnnotationByPage(
        @Param('id') pdfDocumentId: string,
        @Param('pageNumber') pageNumber: number,
        @CurrentUser('id') userId: string,
    ) {
        return this.pdfService.getAnnotationByPage(pdfDocumentId, userId, Number(pageNumber));
    }

    @Delete(':id/annotations/:pageNumber')
    @ApiOperation({ summary: 'Belirli sayfa çizimini sil' })
    deleteAnnotation(
        @Param('id') pdfDocumentId: string,
        @Param('pageNumber') pageNumber: number,
        @CurrentUser('id') userId: string,
    ) {
        return this.pdfService.deleteAnnotation(pdfDocumentId, userId, Number(pageNumber));
    }

    @Delete(':id/annotations')
    @ApiOperation({ summary: 'Tüm çizimleri sil' })
    deleteAllAnnotations(
        @Param('id') pdfDocumentId: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.pdfService.deleteAllAnnotations(pdfDocumentId, userId);
    }

    // ==================== WATERMARK ====================

    @Get('watermark/data')
    @ApiOperation({ summary: 'Watermark verisi getir' })
    getWatermarkData(@CurrentUser() user: any) {
        return this.pdfService.generateWatermarkData(user);
    }
}
