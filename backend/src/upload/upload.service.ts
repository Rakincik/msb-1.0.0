import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

export interface UploadResult {
    url: string;
    fileName: string;
    originalName: string;
    size: number;
    mimeType: string;
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly uploadDir: string;

    constructor(private readonly configService: ConfigService) {
        // Geliştirme ortamında yerel dosya sistemi kullan
        this.uploadDir = path.join(process.cwd(), 'uploads');

        // Upload klasörünü oluştur
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(file: UploadedFile, folder: string = 'general'): Promise<UploadResult> {
        if (!file) {
            throw new BadRequestException('Dosya bulunamadı');
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        const folderPath = path.join(this.uploadDir, folder);
        const filePath = path.join(folderPath, fileName);

        // Klasör yoksa oluştur
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Dosyayı yaz
        fs.writeFileSync(filePath, file.buffer);

        this.logger.log(`Dosya yüklendi: ${filePath}`);

        // Müşteri sunucusunda patlamaması için her zaman relative (göreceli) URL döndürüyoruz:
        const url = `/api/uploads/${folder}/${fileName}`;

        return {
            url,
            fileName,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
        };
    }

    async uploadPdf(file: UploadedFile): Promise<UploadResult> {
        // PDF kontrolü
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Sadece PDF dosyaları yüklenebilir');
        }

        // Max 50MB
        if (file.size > 50 * 1024 * 1024) {
            throw new BadRequestException('Dosya boyutu 50MB\'dan büyük olamaz');
        }

        return this.uploadFile(file, 'pdfs');
    }

    async uploadVideo(file: UploadedFile): Promise<UploadResult> {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];

        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Desteklenmeyen video formatı');
        }

        // Max 500MB
        if (file.size > 500 * 1024 * 1024) {
            throw new BadRequestException('Video boyutu 500MB\'dan büyük olamaz');
        }

        return this.uploadFile(file, 'videos');
    }

    async uploadImage(file: UploadedFile): Promise<UploadResult> {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Desteklenmeyen görsel formatı');
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            throw new BadRequestException('Görsel boyutu 10MB\'dan büyük olamaz');
        }

        return this.uploadFile(file, 'images');
    }

    async deleteFile(fileUrl: string): Promise<void> {
        try {
            // URL'den dosya yolunu çıkar
            const urlParts = fileUrl.split('/uploads/');
            if (urlParts.length !== 2) {
                throw new BadRequestException('Geçersiz dosya URL\'i');
            }

            const filePath = path.join(this.uploadDir, urlParts[1]);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.logger.log(`Dosya silindi: ${filePath}`);
            }
        } catch (error) {
            this.logger.error(`Dosya silinirken hata: ${error.message}`);
            throw new BadRequestException('Dosya silinemedi');
        }
    }
}
