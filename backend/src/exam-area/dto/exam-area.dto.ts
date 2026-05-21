import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateExamAreaDto {
    @ApiProperty({ description: 'Soru bankası adı', example: 'HAKİMLİK' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'URL dostu slug', example: 'hakimlik', required: false })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty({ description: 'Açıklama', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Kapak görseli URL', required: false })
    @IsOptional()
    @IsString()
    coverImage?: string;

    @ApiProperty({ description: 'Lucide icon adı', example: 'Scale', required: false })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiProperty({ description: 'Tema rengi (hex)', example: '#8B5CF6', required: false })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiProperty({ description: 'Sıralama', example: 0, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;

    @ApiProperty({ description: 'Aktif mi?', required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ description: 'Yeni badge göster', required: false })
    @IsOptional()
    @IsBoolean()
    isNew?: boolean;

    @ApiProperty({ description: 'Bağlı ders IDleri', required: false, type: [String] })
    @IsOptional()
    @IsString({ each: true })
    lessonIds?: string[];

    @ApiProperty({ description: 'Bağlı grup IDleri', required: false, type: [String] })
    @IsOptional()
    @IsString({ each: true })
    groupIds?: string[];

    @ApiProperty({ description: 'Tenant ID', required: false })
    @IsOptional()
    @IsString()
    tenantId?: string;
}

export class UpdateExamAreaDto extends PartialType(CreateExamAreaDto) { }
