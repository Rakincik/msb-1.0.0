import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsOptional()
  selectedOptionId?: string;
}

export class GenerateSelfTestDto {
  @IsString()
  @IsNotEmpty()
  examAreaId: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  lessonIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  unitIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  topicIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  learningOutcomeIds?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  difficulties?: string[];

  @IsBoolean()
  @IsOptional()
  onlyIncorrect?: boolean;

  @IsNumber()
  @IsNotEmpty()
  questionCount: number;
}

export class SubmitSelfTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

@Injectable()
export class SelfTestService {
  constructor(private prisma: PrismaService) {}

  async generateTest(userId: string, dto: GenerateSelfTestDto) {
    if (!dto.examAreaId) {
      throw new BadRequestException('ExamArea ID is required.');
    }
    const count = dto.questionCount || 20;

    // Base query
    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      deletedAt: null,
      examAreas: { some: { id: dto.examAreaId } },
    };

    if (dto.difficulties && dto.difficulties.length > 0) {
      where.difficulty = { in: dto.difficulties as any };
    }

    if (dto.learningOutcomeIds && dto.learningOutcomeIds.length > 0) {
      where.learningOutcomeId = { in: dto.learningOutcomeIds };
    } else if (dto.topicIds && dto.topicIds.length > 0) {
      where.topics = { some: { id: { in: dto.topicIds } } };
    } else if (dto.unitIds && dto.unitIds.length > 0) {
      // Need to find topics in these units
      const topics = await this.prisma.topic.findMany({ where: { unitId: { in: dto.unitIds } }, select: { id: true } });
      const topicIds = topics.map(t => t.id);
      if (topicIds.length > 0) {
        where.topics = { some: { id: { in: topicIds } } };
      } else {
        // If no topics found for these units, force no results
        where.id = 'NO_MATCH';
      }
    } else if (dto.lessonIds && dto.lessonIds.length > 0) {
      const units = await this.prisma.unit.findMany({ where: { lessonId: { in: dto.lessonIds } }, select: { id: true } });
      const unitIds = units.map(u => u.id);
      const topics = await this.prisma.topic.findMany({ where: { unitId: { in: unitIds } }, select: { id: true } });
      const topicIds = topics.map(t => t.id);
      if (topicIds.length > 0) {
        where.topics = { some: { id: { in: topicIds } } };
      } else {
        where.id = 'NO_MATCH';
      }
    }

    if (dto.onlyIncorrect) {
      // Find questions this user answered incorrectly
      const incorrectProgress = await this.prisma.userQuestionProgress.findMany({
        where: { userId, isCorrect: false },
        select: { questionId: true }
      });
      const incorrectIds = incorrectProgress.map(p => p.questionId);
      if (incorrectIds.length > 0) {
        where.id = { in: incorrectIds };
      } else {
        where.id = 'NO_MATCH'; // User has no incorrect questions matching this criteria
      }
    }

    // Fetch all matching question IDs
    const matchingQuestions = await this.prisma.question.findMany({
      where,
      select: { id: true }
    });

    if (matchingQuestions.length === 0) {
      return [];
    }

    // Shuffle and slice
    const shuffled = matchingQuestions.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, count).map(q => q.id);

    // Fetch full question data for selected IDs
    const questions = await this.prisma.question.findMany({
      where: { id: { in: selectedIds } },
      include: {
        topics: { select: { id: true, name: true, unitId: true } },
        learningOutcome: { select: { id: true, name: true } }
      }
    });

    // Remove correct answers from output for security (optional, but good practice if frontend handles it. 
    // Here we'll trust the current architecture, usually we should omit correctAnswer from client payload)
    
    // Sort to match selected random order
    const orderedQuestions = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    
    // Convert options object to array and shuffle options for each question to prevent pattern memorization
    const finalQuestions = orderedQuestions.map(q => {
      if (q && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        // q.options is usually { A: {text}, B: {text}, ... }
        // Convert to array of { id: 'A', content: text, image: image }
        const optionsArray = Object.keys(q.options).map(key => ({
          id: key,
          content: q.options[key].text || q.options[key].content || '',
          image: q.options[key].image || null
        }));
        
        // Shuffle the array
        const shuffledOptions = optionsArray.sort(() => 0.5 - Math.random());
        return { ...q, options: shuffledOptions };
      }
      return q;
    });

    return finalQuestions;
  }

  async submitTest(userId: string, dto: SubmitSelfTestDto) {
    const questionIds = dto.answers.map(a => a.questionId);
    if (questionIds.length === 0) {
      throw new BadRequestException('No answers submitted.');
    }

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { topics: true }
    });

    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;
    const evaluatedAnswers = [];
    const topicStats: Record<string, { correct: number, wrong: number, empty: number, name: string }> = {};

    for (const answer of dto.answers) {
      const q = questions.find(question => question.id === answer.questionId);
      if (!q) continue;

      let isCorrect = false;
      let isEmpty = !answer.selectedOptionId;

      if (isEmpty) {
        emptyCount++;
      } else if (q.correctAnswer === answer.selectedOptionId) {
        correctCount++;
        isCorrect = true;
      } else {
        wrongCount++;
      }

      evaluatedAnswers.push({
        questionId: q.id,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
        isEmpty,
        correctOptionId: q.correctAnswer,
        videoSolution: q.videoSolution,
        explanation: q.explanation
      });

      // Update progress
      if (!isEmpty) {
        await this.prisma.userQuestionProgress.upsert({
          where: { userId_questionId: { userId, questionId: q.id } },
          update: { isCorrect, optionId: answer.selectedOptionId },
          create: { userId, questionId: q.id, isCorrect, optionId: answer.selectedOptionId }
        });
      }

      // Topic stats
      q.topics.forEach(t => {
        if (!topicStats[t.id]) topicStats[t.id] = { correct: 0, wrong: 0, empty: 0, name: t.name };
        if (isEmpty) topicStats[t.id].empty++;
        else if (isCorrect) topicStats[t.id].correct++;
        else topicStats[t.id].wrong++;
      });
    }

    // Save Result
    const result = await this.prisma.selfTestResult.create({
      data: {
        userId,
        correctCount,
        wrongCount,
        emptyCount,
        answers: evaluatedAnswers,
        topics: topicStats
      }
    });

    return {
      resultId: result.id,
      correctCount,
      wrongCount,
      emptyCount,
      topicStats,
      evaluatedAnswers
    };
  }
}
