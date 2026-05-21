import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';

export class CreateQuestionReportDto {
    @ApiProperty({ description: 'The ID of the question being reported' })
    @IsString()
    @IsNotEmpty()
    questionId: string;

    @ApiProperty({ description: 'The reason or explanation for reporting the question' })
    @IsString()
    @IsNotEmpty()
    content: string;
}

export class UpdateQuestionReportStatusDto {
    @ApiProperty({ description: 'The new status of the report', enum: ReportStatus })
    @IsEnum(ReportStatus)
    @IsNotEmpty()
    status: ReportStatus;
}
