import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvestigatorService } from './investigator.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeJobFailureDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;
}

@ApiTags('AI Failure Investigator')
@Controller('api/v1/investigator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestigatorController {
  constructor(private readonly investigatorService: InvestigatorService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze failed job execution logs, classify root-cause, and generate remediation actions' })
  @ApiResponse({ status: 200, description: 'Root-cause analysis and mitigation report' })
  async analyzeJob(@Body() dto: AnalyzeJobFailureDto) {
    return this.investigatorService.analyzeJobFailure(dto.jobId);
  }
}
