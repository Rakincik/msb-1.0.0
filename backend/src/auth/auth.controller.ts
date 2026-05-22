import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: 'Yeni kullanıcı kaydı' })
    @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla oluşturuldu' })
    @ApiResponse({ status: 409, description: 'Email zaten kullanılıyor' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }


    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Kullanıcı girişi' })
    @ApiResponse({ status: 200, description: 'Giriş başarılı' })
    @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Token yenileme' })
    @ApiResponse({ status: 200, description: 'Token başarıyla yenilendi' })
    @ApiResponse({ status: 401, description: 'Geçersiz refresh token' })
    async refreshTokens(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Çıkış yap' })
    async logout(@Body() dto: RefreshTokenDto) {
        await this.authService.logout(dto.refreshToken);
        return { message: 'Çıkış yapıldı' };
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Tüm cihazlardan çıkış yap' })
    async logoutAll(@CurrentUser('id') userId: string) {
        await this.authService.logoutAll(userId);
        return { message: 'Tüm cihazlardan çıkış yapıldı' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kullanıcı profilini getir' })
    async getProfile(@CurrentUser('id') userId: string) {
        return this.authService.getProfile(userId);
    }
}
