import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveProgressDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    questionId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    optionId: string;

    @ApiProperty()
    @IsBoolean()
    isCorrect: boolean;
}
