import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';

/**
 * TenantInterceptor - Global interceptor
 * Her request'e otomatik olarak tenantScope enjekte eder.
 * SUPER_ADMIN: null (tüm verilere erişim)
 * Diğerleri: JWT'deki tenantId'ye kilitlenir
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && user.role !== Role.SUPER_ADMIN) {
            // SUPER_ADMIN hariç herkes kendi tenant'ına kilitlenir
            request.tenantScope = user.tenantId || null;
        } else {
            // SUPER_ADMIN veya auth olmayan endpoint'ler → tüm veriler
            request.tenantScope = null;
        }

        return next.handle();
    }
}
