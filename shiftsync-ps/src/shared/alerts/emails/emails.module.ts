import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { EmailsConsumer } from './emails.consumer';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [BullModule.registerQueue({ name: 'emailQueue' })],
  providers: [EmailsService, EmailsConsumer],
  controllers: [EmailsController],
})
export class EmailsModule {}
