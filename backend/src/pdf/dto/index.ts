import { IsString, IsOptional, IsInt, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ==================== PDF DOCUMENT DTOs ====================

export class CreatePdfDocumentDto {
    @ApiProperty({ example: 'KPSS Deneme Sınavı 2024' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'kpss-deneme-2024.pdf' })
    @IsString()
    fileName: string;

    @ApiProperty({ example: 'https://storage.example.com/pdfs/kpss-deneme-2024.pdf' })
    @IsString()
    fileUrl: string;

    @ApiProperty({ example: 1048576, description: 'Dosya boyutu (byte)' })
    @IsInt()
    fileSize: number;

    @ApiPropertyOptional({ example: 40 })
    @IsOptional()
    @IsInt()
    pageCount?: number;

    @ApiPropertyOptional({
        description: 'Cevap anahtarı',
        example: { "1": "A", "2": "B", "3": "C" }
    })
    @IsOptional()
    @IsObject()
    answerKey?: Record<string, string>;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Tenant ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;
}

export class UpdatePdfDocumentDto extends PartialType(CreatePdfDocumentDto) { }

// ==================== ANSWER KEY DTO ====================

export class SetAnswerKeyDto {
    @ApiProperty({
        description: 'Cevap anahtarı',
        example: { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" }
    })
    @IsObject()
    answerKey: Record<string, string>;
}

// ==================== ANNOTATION DTOs ====================

export class SaveAnnotationDto {
    @ApiProperty({ description: 'PDF doküman ID' })
    @IsString()
    pdfDocumentId: string;

    @ApiProperty({ example: 1, description: 'Sayfa numarası' })
    @IsInt()
    pageNumber: number;

    @ApiProperty({
        description: 'Çizim verisi (Konva/Fabric JSON formatı)',
        example: {
            objects: [
                { type: 'path', points: [100, 100, 200, 200], stroke: '#ff0000', strokeWidth: 2 },
                { type: 'rect', x: 50, y: 50, width: 100, height: 50, fill: 'rgba(255,255,0,0.3)' }
            ]
        }
    })
    @IsObject()
    data: any;
}
