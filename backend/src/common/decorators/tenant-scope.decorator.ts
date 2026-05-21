import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * TenantScope decorator - Controller parametrelerinde kullanılır
 * TenantInterceptor tarafından enjekte edilen tenantScope değerini alır.
 * SUPER_ADMIN için null döner (tüm verilere erişim).
 * Diğerleri için kullanıcının tenantId'sini döner.
 */
export const TenantScope = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | null => {
        const request = ctx.switchToHttp().getRequest();
        return request.tenantScope ?? null;
    },
);
