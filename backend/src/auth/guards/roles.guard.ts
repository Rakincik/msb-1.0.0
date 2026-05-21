import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('Kullanıcı bilgisi bulunamadı');
        }

        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole) {
            console.log('RolesGuard failed! User role:', user.role, 'Required:', requiredRoles);
            throw new ForbiddenException('Bu işlem için yetkiniz yok');
        }

        return true;
    }
}
