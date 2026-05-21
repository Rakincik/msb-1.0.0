import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Yeni kullanıcı oluştur' })
    create(
        @Body() dto: CreateUserDto,
        @CurrentUser('role') creatorRole: Role,
        @CurrentUser('tenantId') creatorTenantId: string,
    ) {
        return this.userService.create(dto, creatorRole, creatorTenantId);
    }

    @Post('bulk-upload')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Excel ile toplu kullanıcı yükle' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async bulkUpload(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser('role') creatorRole: Role,
        @CurrentUser('tenantId') creatorTenantId: string,
    ) {
        if (!file) {
            throw new BadRequestException('Dosya bulunamadı');
        }
        return this.userService.bulkUploadUsers(file.buffer, creatorRole, creatorTenantId);
    }

    @Get()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcıları listele' })
    @ApiQuery({ name: 'tenantId', required: false })
    @ApiQuery({ name: 'role', required: false, enum: Role })
    @ApiQuery({ name: 'classId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    findAll(
        @Query('tenantId') tenantId?: string,
        @Query('role') role?: Role,
        @Query('classId') classId?: string,
        @Query('search') search?: string,
        @Query('isActive') isActive?: string,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @CurrentUser() currentUser?: any,
    ) {
        // Admin ve Teacher sadece kendi tenant'larını görebilir
        if (currentUser?.role !== Role.SUPER_ADMIN) {
            tenantId = currentUser?.tenantId;
        }

        return this.userService.findAll({
            tenantId,
            role,
            classId,
            search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
            sortBy,
            sortOrder,
        });
    }

    @Get(':id/stats')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı istatistikleri' })
    getStats(@Param('id') id: string) {
        return this.userService.getUserStats(id);
    }

    @Get(':id/exam-results')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı sınav sonuçları' })
    getExamResults(@Param('id') id: string) {
        return this.userService.getUserExamResults(id);
    }

    @Get(':id/activity')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı aktivite geçmişi' })
    getActivity(@Param('id') id: string) {
        return this.userService.getUserActivity(id);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı detayı' })
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı güncelle' })
    update(
        @Param('id') id: string, 
        @Body() dto: UpdateUserDto,
        @CurrentUser() currentUser: any
    ) {
        return this.userService.update(id, dto, currentUser);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcı sil' })
    remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
        return this.userService.remove(id, currentUser);
    }

    @Patch(':id/deactivate')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcıyı devre dışı bırak' })
    deactivate(@Param('id') id: string, @CurrentUser() currentUser: any) {
        return this.userService.deactivate(id, currentUser);
    }

    @Patch(':id/activate')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Kullanıcıyı aktifleştir' })
    activate(@Param('id') id: string, @CurrentUser() currentUser: any) {
        return this.userService.activate(id, currentUser);
    }

    @Patch(':userId/assign-class/:classId')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Öğrenciyi sınıfa ata' })
    assignToClass(
        @Param('userId') userId: string,
        @Param('classId') classId: string,
        @CurrentUser() currentUser: any
    ) {
        return this.userService.assignToClass(userId, classId, currentUser);
    }

    @Patch(':userId/remove-class')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Öğrenciyi sınıftan çıkar' })
    removeFromClass(@Param('userId') userId: string, @CurrentUser() currentUser: any) {
        return this.userService.removeFromClass(userId, currentUser);
    }
}
