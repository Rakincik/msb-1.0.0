import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Tenant bazlı erişim kontrolü
 * - SUPER_ADMIN: Tüm tenantlara erişebilir
 * - Diğerleri: Sadece kendi tenant'larına erişebilir
 */
@Injectable()
export class TenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Super admin her yere erişebilir
        if (user.role === Role.SUPER_ADMIN) {
            return true;
        }

        // Tenant ID'si gerektiren endpoint'ler için kontrol
        const tenantIdFromParam = request.params.tenantId;
        const tenantIdFromBody = request.body?.tenantId;
        const tenantIdFromQuery = request.query?.tenantId;

        const requestedTenantId = tenantIdFromParam || tenantIdFromBody || tenantIdFromQuery;

        // Eğer tenant ID isteniyorsa ve kullanıcının tenant'ı ile uyuşmuyorsa reddet
        if (requestedTenantId && requestedTenantId !== user.tenantId) {
            throw new ForbiddenException('Bu kuruma erişim yetkiniz yok');
        }

        return true;
    }
}
