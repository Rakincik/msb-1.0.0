import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

export interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
    tenantId?: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: Role;
        tenantId?: string;
    };
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
    ) { }

    async register(dto: RegisterDto): Promise<TokenResponse> {
        // Email kontrolü
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Bu email adresi zaten kullanılıyor');
        }

        // Kullanıcı oluştur — Register her zaman STUDENT rolü atar
        // Rol ve tenant ataması sadece admin panelinden yapılır (POST /api/users)
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: dto.password, // Şifre düz metin olarak kaydediliyor (Hobi projesi isteği üzerine)
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: Role.STUDENT, // Zorla STUDENT
                tcNo: dto.tcNo,
                phone: dto.phone,
                // tenantId yok — admin tarafından atanacak
            },
        });

        this.logger.log(`Yeni kullanıcı oluşturuldu: ${user.email} (STUDENT)`);

        return this.generateTokens(user);
    }

    async login(dto: LoginDto): Promise<TokenResponse> {
        const user = await this.validateUser(dto.email, dto.password);

        // Son giriş zamanını güncelle
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        this.logger.log(`Kullanıcı giriş yaptı: ${user.email}`);

        return this.generateTokens(user);
    }

    async validateUser(email: string, password: string) {
        this.logger.log(`🔍 Login denemesi: ${email}`);

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            this.logger.warn(`❌ Kullanıcı bulunamadı: ${email}`);
            // Debug: Tüm kullanıcı emaillerini listele
            const allUsers = await this.prisma.user.findMany({
                select: { email: true, role: true, isActive: true },
            });
            this.logger.log(`📋 Veritabanındaki kullanıcılar: ${JSON.stringify(allUsers)}`);
            throw new UnauthorizedException('Email veya şifre hatalı');
        }

        this.logger.log(`✅ Kullanıcı bulundu: ${user.email}, Rol: ${user.role}, Aktif: ${user.isActive}`);
        
        if (!user.isActive) {
            this.logger.warn(`⛔ Hesap devre dışı: ${user.email}`);
            throw new UnauthorizedException('Hesabınız devre dışı bırakılmış');
        }

        // Şifre tipini logla (hash mi düz metin mi?)
        const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
        this.logger.log(`🔑 Şifre tipi: ${isHashed ? 'BCRYPT HASH' : 'DÜZ METİN'} (uzunluk: ${user.password.length})`);

        // Şifreler düz metin olarak tutulmaya başlandığı için önce doğrudan eşitlik kontrolü
        let isPasswordValid = password === user.password;
        this.logger.log(`🔐 Düz metin karşılaştırma: ${isPasswordValid ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);

        // Eğer düz metin eşleşmediyse (eski hashli şifre olabilir), bcrypt ile kontrol et
        if (!isPasswordValid) {
            try {
                isPasswordValid = await bcrypt.compare(password, user.password);
                this.logger.log(`🔐 Bcrypt karşılaştırma: ${isPasswordValid ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
            } catch (bcryptError) {
                this.logger.error(`💥 Bcrypt hatası: ${bcryptError.message}`);
                isPasswordValid = false;
            }
        }

        if (!isPasswordValid) {
            this.logger.warn(`❌ Şifre hatalı: ${email}`);
            throw new UnauthorizedException('Email veya şifre hatalı');
        }

        this.logger.log(`🎉 Login başarılı: ${user.email}`);
        return user;
    }

    /**
     * Acil durum admin şifre sıfırlama.
     * Güvenlik: Sadece SECRET_KEY ile çağrılabilir.
     * Kullanımdan sonra bu metodu kaldırın!
     */
    async emergencyResetAdmin(email: string, newPassword: string, secretKey: string) {
        // JWT_SECRET ile doğrula
        const expectedSecret = this.configService.get('JWT_SECRET');
        if (secretKey !== expectedSecret) {
            throw new UnauthorizedException('Geçersiz secret key');
        }

        // Kullanıcıyı bul veya oluştur
        let user = await this.prisma.user.findUnique({ where: { email } });

        if (user) {
            // Şifreyi düz metin olarak güncelle
            user = await this.prisma.user.update({
                where: { email },
                data: { password: newPassword, isActive: true },
            });
            this.logger.warn(`🔧 Şifre sıfırlandı: ${email}`);
        } else {
            // Kullanıcı yoksa oluştur
            user = await this.prisma.user.create({
                data: {
                    email,
                    password: newPassword,
                    firstName: 'Admin',
                    lastName: 'User',
                    role: Role.SUPER_ADMIN,
                    isActive: true,
                },
            });
            this.logger.warn(`🔧 Yeni admin oluşturuldu: ${email}`);
        }

        return { message: `Şifre başarıyla sıfırlandı: ${email}`, userId: user.id, role: user.role };
    }

    async refreshTokens(refreshToken: string): Promise<TokenResponse> {
        try {
            // Refresh token'ı doğrula
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            // Token'ın veritabanında olup olmadığını kontrol et
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
            });

            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new UnauthorizedException('Geçersiz refresh token');
            }

            // Kullanıcıyı bul
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Kullanıcı bulunamadı');
            }

            // Eski refresh token'ı sil
            await this.prisma.refreshToken.delete({
                where: { token: refreshToken },
            });

            return this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Geçersiz refresh token');
        }
    }

    async logout(refreshToken: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
    }

    async logoutAll(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }

    private async generateTokens(user: any): Promise<TokenResponse> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        };

        // Access token
        const accessToken = this.jwtService.sign(payload);

        // Refresh token
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
        });

        // Refresh token'ı veritabanına kaydet (upsert to handle race conditions)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.refreshToken.upsert({
            where: { token: refreshToken },
            update: { expiresAt },
            create: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
            },
        };
    }

    async getProfile(userId: string) {
        return this.userService.findOne(userId);
    }
}
