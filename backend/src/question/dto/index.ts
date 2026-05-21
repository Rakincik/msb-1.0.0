import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsArray, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DifficultyLevel, QuestionType } from '@prisma/client';

// ==================== CREATE QUESTION DTO ====================

export class CreateQuestionDto {
    @ApiProperty({
        description: 'Soru içeriği (HTML/JSON formatında)',
        example: { text: 'Aşağıdakilerden hangisi doğrudur?', image: null }
    })
    @IsObject()
    content: any;

    @ApiProperty({
        description: 'Şıklar',
        example: { A: 'Seçenek A', B: 'Seçenek B', C: 'Seçenek C', D: 'Seçenek D', E: 'Seçenek E' }
    })
    @IsObject()
    options: any;

    @ApiProperty({ example: 'A', description: 'Doğru cevap (A, B, C, D, E)' })
    @IsString()
    correctAnswer: string;

    @ApiPropertyOptional({
        description: 'Çözüm açıklaması',
        example: { text: 'Bu sorunun çözümü şu şekildedir...' }
    })
    @IsOptional()
    @IsObject()
    explanation?: any;

    @ApiPropertyOptional({ enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
    @IsOptional()
    @IsEnum(QuestionType)
    type?: QuestionType;

    @ApiPropertyOptional({ enum: DifficultyLevel, default: DifficultyLevel.MEDIUM })
    @IsOptional()
    @IsEnum(DifficultyLevel)
    difficulty?: DifficultyLevel;

    @ApiPropertyOptional({ description: 'Video çözüm URL' })
    @IsOptional()
    @IsString()
    videoSolution?: string;

    @ApiPropertyOptional({ description: 'Çıkmış soru mu?' })
    @IsOptional()
    @IsBoolean()
    isPastQuestion?: boolean;

    @ApiPropertyOptional({ description: 'Çıkmış soruysa sınav adı (Örn: Kaymakamlık)' })
    @IsOptional()
    @IsString()
    pastExamName?: string;

    @ApiPropertyOptional({ description: 'Çıkmış soruysa yılı (Örn: 2024)' })
    @IsOptional()
    @IsInt()
    pastExamYear?: number;

    @ApiProperty({ description: 'Konu ID listesi', type: [String] })
    @IsArray()
    @IsString({ each: true })
    topicIds: string[];

    @ApiPropertyOptional({ description: 'Kazanım ID' })
    @IsOptional()
    @IsString()
    learningOutcomeId?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Soru Bankası ID listesi', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    examAreaIds?: string[];

    @ApiPropertyOptional({ description: 'Tenant ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;
}

// ==================== UPDATE QUESTION DTO ====================

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) { }

// ==================== FILTER DTO ====================

export class QuestionFilterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    unitId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    lessonId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    learningOutcomeId?: string;

    @ApiPropertyOptional({ description: 'Soru Bankası ID' })
    @IsOptional()
    @IsString()
    examAreaId?: string;

    @ApiPropertyOptional({ enum: DifficultyLevel })
    @IsOptional()
    @IsEnum(DifficultyLevel)
    difficulty?: DifficultyLevel;

    @ApiPropertyOptional({ enum: QuestionType })
    @IsOptional()
    @IsEnum(QuestionType)
    type?: QuestionType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    createdById?: string;

    @ApiPropertyOptional({ description: 'Çıkmış soru mu?' })
    @IsOptional()
    @IsBoolean()
    isPastQuestion?: boolean;

    @ApiPropertyOptional({ description: 'Çıkmış soruysa sınav adı' })
    @IsOptional()
    @IsString()
    pastExamName?: string;

    @ApiPropertyOptional({ description: 'Çıkmış soruysa yılı' })
    @IsOptional()
    @IsInt()
    pastExamYear?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    skip?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    take?: number;
}

// ==================== RANDOM QUESTIONS DTO ====================

export class RandomQuestionsDto {
    @ApiPropertyOptional({ type: [String], description: 'Konu ID listesi' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    topicIds?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Soru Bankası ID listesi' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    examAreaIds?: string[];

    @ApiProperty({ example: 10, description: 'Kaç soru isteniyor' })
    @IsInt()
    @Min(1)
    @Max(100)
    count: number;

    @ApiPropertyOptional({ enum: DifficultyLevel })
    @IsOptional()
    @IsEnum(DifficultyLevel)
    difficulty?: DifficultyLevel;

    @ApiPropertyOptional({ type: [String], description: 'Hariç tutulacak soru ID listesi' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    excludeIds?: string[];
}
