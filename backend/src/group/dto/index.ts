import { IsString, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GroupType } from '@prisma/client';

// ==================== CREATE GROUP DTO ====================
export class CreateGroupDto {
    @ApiProperty({ example: 'KPSS A 2025' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'kpss-a-2025', description: 'Unique slug/code' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ example: 'KPSS A Grubu 2025 yılı hazırlık programı' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Tenant ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiPropertyOptional({ description: 'Parent group ID for sub-groups' })
    @IsOptional()
    @IsString()
    parentId?: string;

    @ApiPropertyOptional({ enum: GroupType, default: GroupType.OFFLINE })
    @IsOptional()
    type?: GroupType;
}

// ==================== UPDATE GROUP DTO ====================
export class UpdateGroupDto extends PartialType(CreateGroupDto) { }

// ==================== ASSIGN STUDENTS DTO ====================
export class AssignStudentsDto {
    @ApiProperty({ type: [String], description: 'User IDs to assign' })
    @IsArray()
    @IsString({ each: true })
    userIds: string[];
}

// ==================== ASSIGN CONTENT DTO ====================
export class AssignContentDto {
    @ApiPropertyOptional({ type: [String], description: 'Exam IDs to assign' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    examIds?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Question IDs to assign' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    questionIds?: string[];

    @ApiPropertyOptional({ type: [String], description: 'PDF IDs to assign' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    pdfIds?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Lesson IDs to assign' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    lessonIds?: string[];
}
