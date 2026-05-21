import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveProgressDto } from './dto/save-progress.dto';

@Injectable()
export class QuestionProgressService {
    constructor(private prisma: PrismaService) { }

    async saveProgress(userId: string, dto: SaveProgressDto) {
        return this.prisma.userQuestionProgress.upsert({
            where: {
                userId_questionId: {
                    userId,
                    questionId: dto.questionId,
                },
            },
            update: {
                optionId: dto.optionId,
                isCorrect: dto.isCorrect,
            },
            create: {
                userId,
                questionId: dto.questionId,
                optionId: dto.optionId,
                isCorrect: dto.isCorrect,
            },
        });
    }

    async getProgressByTopic(userId: string, topicId: string) {
        return this.prisma.userQuestionProgress.findMany({
            where: {
                userId,
                question: {
                    topics: {
                        some: { id: topicId },
                    },
                },
            },
            select: {
                questionId: true,
                optionId: true,
                isCorrect: true
            }
        });
    }

    async getProgressByLesson(userId: string, lessonId: string) {
        return this.prisma.userQuestionProgress.findMany({
            where: {
                userId,
                question: {
                    topics: {
                        some: {
                            unit: {
                                lessonId: lessonId
                            }
                        }
                    }
                }
            },
            select: {
                questionId: true,
                optionId: true,
                isCorrect: true
            }
        });
    }
}
