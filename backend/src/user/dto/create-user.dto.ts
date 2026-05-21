import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ example: 'ornek@email.com' })
    @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
    email: string;

    @ApiProperty({ example: 'Sifre123!' })
    @IsString()
    @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
    password: string;

    @ApiProperty({ example: 'Ahmet' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'Yılmaz' })
    @IsString()
    lastName: string;

    @ApiPropertyOptional({ example: '12345678901' })
    @IsOptional()
    @IsString()
    tcNo?: string;

    @ApiPropertyOptional({ example: '5551234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ enum: Role })
    @IsEnum(Role)
    role: Role;

    @ApiPropertyOptional({ description: 'Kurum ID' })
    @IsOptional()
    @IsString()
    tenantId?: string;

    @ApiPropertyOptional({ description: 'Sınıf ID (Öğrenci için)' })
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
