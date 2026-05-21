import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupService } from './group.service';
import { CreateGroupDto, UpdateGroupDto, AssignStudentsDto, AssignContentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupController {
    constructor(private readonly groupService: GroupService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Create new group' })
    create(@Body() dto: CreateGroupDto, @CurrentUser() user: any) {
        if (!dto.tenantId && user?.tenantId) {
            dto.tenantId = user.tenantId;
        }
        return this.groupService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all groups' })
    findAll(@Query('tenantId') tenantId?: string, @CurrentUser() user?: any) {
        // If user is not SUPER_ADMIN, enforce their tenant scope
        const scope = user?.role !== Role.SUPER_ADMIN ? user?.tenantId : undefined;
        return this.groupService.findAll(tenantId, scope);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Group details' })
    findOne(@Param('id') id: string) {
        return this.groupService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Update group' })
    update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
        return this.groupService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Delete group' })
    remove(@Param('id') id: string) {
        return this.groupService.remove(id);
    }

    // ==================== STUDENT MANAGEMENT ====================
    @Get(':id/students')
    @ApiOperation({ summary: 'List students in group' })
    getStudents(@Param('id') id: string) {
        return this.groupService.getStudents(id);
    }

    @Post(':id/students')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Add student to group' })
    assignStudents(@Param('id') id: string, @Body() dto: AssignStudentsDto) {
        return this.groupService.assignStudents(id, dto);
    }

    @Delete(':id/students')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Remove student from group' })
    removeStudents(@Param('id') id: string, @Body() dto: AssignStudentsDto) {
        return this.groupService.removeStudents(id, dto);
    }

    // ==================== CONTENT MANAGEMENT ====================
    @Get(':id/exams')
    @ApiOperation({ summary: 'List exams assigned to group' })
    getExams(@Param('id') id: string) {
        return this.groupService.getExams(id);
    }

    @Post(':id/content')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Assign content to group (test, question, PDF, lesson)' })
    assignContent(@Param('id') id: string, @Body() dto: AssignContentDto) {
        return this.groupService.assignContent(id, dto);
    }

    @Delete(':id/content')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: 'Remove content from group' })
    removeContent(@Param('id') id: string, @Body() dto: AssignContentDto) {
        return this.groupService.removeContent(id, dto);
    }
}
