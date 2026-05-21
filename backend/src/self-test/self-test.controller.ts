import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SelfTestService, GenerateSelfTestDto, SubmitSelfTestDto } from './self-test.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('self-test')
@UseGuards(JwtAuthGuard)
export class SelfTestController {
  constructor(private readonly selfTestService: SelfTestService) {}

  @Post('generate')
  async generateTest(@Req() req, @Body() dto: GenerateSelfTestDto) {
    const userId = req.user.id;
    return this.selfTestService.generateTest(userId, dto);
  }

  @Post('submit')
  async submitTest(@Req() req, @Body() dto: SubmitSelfTestDto) {
    const userId = req.user.id;
    return this.selfTestService.submitTest(userId, dto);
  }
}
