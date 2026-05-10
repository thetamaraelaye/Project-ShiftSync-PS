import { Injectable } from '@nestjs/common';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { OnEvent } from '@nestjs/event-emitter';
import { PlatformEvents } from '@common/constants';

@Injectable()
export class EmailsService {
  constructor(
    private readonly mailerService: MailerService,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
  ) {}

  async send(payload: ISendMailOptions) {
    return this.mailerService.sendMail(payload);
  }

  @OnEvent(PlatformEvents.send_email)
  enqueueTask(payload: ISendMailOptions) {
    this.emailQueue.add(payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
