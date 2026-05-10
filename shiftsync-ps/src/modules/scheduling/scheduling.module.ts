import { Module } from '@nestjs/common';
import { SchedulingConstraintService } from './constraint.service';

@Module({
  providers: [SchedulingConstraintService],
  exports: [SchedulingConstraintService],
})
export class SchedulingModule {}
