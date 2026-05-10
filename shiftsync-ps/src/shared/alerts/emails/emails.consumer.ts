import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { EmailsService } from './emails.service';
import { Job } from 'bull';
import { ISendMailOptions } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

@Processor('emailQueue')
export class EmailsConsumer {
  private readonly logger = new Logger(EmailsConsumer.name, { timestamp: true });
  constructor(private readonly emailsService: EmailsService) {}

  @Process()
  async send(job: Job<ISendMailOptions>) {
    try {
      await this.emailsService.send(job.data);
      this.logger.log('Email sent');
    } catch (error) {
      console.error('Failed to complete email job', error);
      this.logger.log('Error sending emall dispatch task');
      return;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing email task`, job.id);
  }

  @OnQueueError()
  onError(err: Error) {
    console.log(`Error processing email task `, err);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Email task completed successfully`, job.id);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    console.error(`Email task failed`, job.id, err);
  }
}
