import {
    Controller,
    Get,
    Post,
    Param,
    Res,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import * as path from 'path';

@ApiTags('Downloads')
@Controller('uploads')
export class DownloadsController {
    @Get(':folder/:filename')
    @ApiOperation({ summary: 'Dosya görüntüle/indir' })
    downloadFile(@Param('folder') folder: string, @Param('filename') filename: string, @Res() res: Response) {
        const filePath = path.join(process.cwd(), 'uploads', folder, filename);
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Bulunamadı');
        }
        
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';
        
        res.setHeader('Content-Type', contentType);
        
        // Use createReadStream to bypass Express res.sendFile potential issues on Windows
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            if (!res.headersSent) {
                res.status(500).send('Sunucu Hatası');
            }
        });
        
        fileStream.pipe(res);
    }
}

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('pdf')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
    }))
    @ApiOperation({ summary: 'PDF yükle' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    async uploadPdf(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('Dosya bulunamadı');
        }
        return this.uploadService.uploadPdf(file);
    }

    @Post('video')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
    }))
    @ApiOperation({ summary: 'Video yükle' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    async uploadVideo(@UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('Dosya bulunamadı');
        }
        return this.uploadService.uploadVideo(file);
    }

    @Post('image')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
    }))
    @ApiOperation({ summary: 'Görsel yükle' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    async uploadImage(@UploadedFile() file: any) {
        console.log('Upload Request Received:', file ? `File size: ${file.size}` : 'No file');
        if (!file) {
            throw new BadRequestException('Dosya bulunamadı');
        }
        return this.uploadService.uploadImage(file);
    }
}
