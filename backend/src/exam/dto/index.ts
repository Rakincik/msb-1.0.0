import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsArray, IsNumber, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ExamType, ExamStatus } from '@prisma/client';

// ==================== CREATE EXAM DTO ====================

export class CreateExamDto {
    @ApiProperty({ example: 'KPSS Deneme Sınavı 1' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 'Genel kültür ve genel yetenek' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: ExamType })
    @IsEnum(ExamType)
    type: ExamType;

    @ApiPropertyOptional({ description: 'Kurum ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiProperty({ example: 120, description: 'Süre (dakika)' })
    @IsInt()
    duration: number;

    @ApiPropertyOptional({ description: 'Başlangıç zamanı' })
    @IsOptional()
    @IsDateString()
    startTime?: string;

    @ApiPropertyOptional({ description: 'Bitiş zamanı' })
    @IsOptional()
    @IsDateString()
    endTime?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    correctPoints?: number;

    @ApiPropertyOptional({ default: 0.25, description: '4 yanlış 1 doğruyu götürür' })
    @IsOptional()
    @IsNumber()
    wrongPenalty?: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    shuffleQuestions?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    shuffleOptions?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    showResults?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    allowReview?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    singleAttempt?: boolean;

    @ApiPropertyOptional({ description: 'PDF doküman ID (PDF bazlı sınav için)' })
    @IsOptional()
    @IsString()
    pdfDocumentId?: string;

    @ApiPropertyOptional({ type: [String], description: 'Soru ID listesi' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    questionIds?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Sınıf ID listesi (atanacak sınıflar)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    classIds?: string[];
}

// ==================== UPDATE EXAM DTO ====================

export class UpdateExamDto extends PartialType(CreateExamDto) {
    @ApiPropertyOptional({ enum: ExamStatus })
    @IsOptional()
    @IsEnum(ExamStatus)
    status?: ExamStatus;
}

// ==================== SUBMIT EXAM DTO ====================

export class SubmitExamDto {
    @ApiProperty({ description: 'Sınav sonuç ID' })
    @IsString()
    resultId: string;

    @ApiProperty({
        description: 'Cevaplar',
        example: { "1": "A", "2": "B", "3": "C" }
    })
    @IsObject()
    answers: Record<string, string>;
}

// ==================== START EXAM DTO ====================

export class StartExamDto {
    @ApiProperty({ description: 'Sınav ID' })
    @IsString()
    examId: string;
}
