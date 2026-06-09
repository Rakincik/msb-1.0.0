import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ==================== LESSON DTOs ====================

export class CreateLessonDto {
    @ApiProperty({ example: 'Türkçe' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'TRK' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    order?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiPropertyOptional({ type: [String], example: ['exam-area-id-1'] })
    @IsOptional()
    @IsString({ each: true })
    examAreaIds?: string[];

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) { }

// ==================== UNIT DTOs ====================

export class CreateUnitDto {
    @ApiProperty({ example: 'Sözcükte Anlam' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Ders ID' })
    @IsString()
    lessonId: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    order?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) { }

// ==================== TOPIC DTOs ====================

export class CreateTopicDto {
    @ApiProperty({ example: 'Eş Anlamlı Sözcükler' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Ünite ID' })
    @IsString()
    unitId: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    order?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateTopicDto extends PartialType(CreateTopicDto) { }

// ==================== LEARNING OUTCOME DTOs ====================

export class CreateLearningOutcomeDto {
    @ApiProperty({ example: 'Eş anlamlı sözcükleri tanır' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'T.5.1.1' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiProperty({ description: 'Konu ID' })
    @IsString()
    topicId: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    order?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateLearningOutcomeDto extends PartialType(CreateLearningOutcomeDto) { }

// ==================== BULK IMPORT DTOs ====================

export class BulkImportItemDto {
    @ApiProperty({ example: 'Sözcükte Anlam' })
    @IsString()
    unitName: string;

    @ApiProperty({ example: 'Eş Anlamlı Sözcükler' })
    @IsString()
    topicName: string;
}

