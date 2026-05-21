import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'ornek@email.com' })
    @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
    email: string;

    @ApiProperty({ example: 'Sifre123!' })
    @IsString()
    @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
    password: string;
}
