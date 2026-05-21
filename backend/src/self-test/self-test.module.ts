import { Module } from '@nestjs/common';
import { SelfTestService } from './self-test.service';
import { SelfTestController } from './self-test.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SelfTestController],
  providers: [SelfTestService],
  exports: [SelfTestService],
})
export class SelfTestModule {}
