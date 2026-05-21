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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantController {
    constructor(private readonly tenantService: TenantService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Yeni kurum oluştur' })
    create(@Body() dto: CreateTenantDto) {
        return this.tenantService.create(dto);
    }

    @Get()
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Kurumları listele' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    @ApiQuery({ name: 'take', required: false, type: Number })
    findAll(
        @Query('search') search?: string,
        @Query('isActive') isActive?: boolean,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
    ) {
        return this.tenantService.findAll({
            search,
            isActive,
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
        });
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Kurum detayı' })
    findOne(@Param('id') id: string) {
        return this.tenantService.findOne(id);
    }

    @Get('slug/:slug')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Slug ile kurum bul' })
    findBySlug(@Param('slug') slug: string) {
        return this.tenantService.findBySlug(slug);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Kurum güncelle' })
    update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
        return this.tenantService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Kurum sil' })
    remove(@Param('id') id: string) {
        return this.tenantService.remove(id);
    }

    @Patch(':id/deactivate')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Kurumu devre dışı bırak' })
    deactivate(@Param('id') id: string) {
        return this.tenantService.deactivate(id);
    }

    @Patch(':id/activate')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Kurumu aktifleştir' })
    activate(@Param('id') id: string) {
        return this.tenantService.activate(id);
    }

    @Get(':id/stats')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Kurum istatistikleri' })
    getStats(@Param('id') id: string) {
        return this.tenantService.getStats(id);
    }
}
