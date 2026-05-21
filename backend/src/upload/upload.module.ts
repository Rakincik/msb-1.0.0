import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController, DownloadsController } from './upload.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
@Module({
    imports: [ConfigModule, AuthModule],
    controllers: [UploadController, DownloadsController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule { }
