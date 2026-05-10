import { Processor } from '@nestjs/bull';

@Processor('notifyQueue')
export class NotificationsConsumer {}
