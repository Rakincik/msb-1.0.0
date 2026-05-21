import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
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

    // role ve tenantId kaldırıldı — register her zaman STUDENT oluşturur
    // Rol ve tenant ataması sadece admin panelinden yapılır (POST /users)
}

