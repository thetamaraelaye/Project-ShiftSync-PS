import { Module } from '@nestjs/common';
import { CoverageService } from './coverage.service';
import { CoverageController } from './coverage.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  providers: [CoverageService],
  controllers: [CoverageController],
  exports: [CoverageService],
})
export class CoverageModule {}
