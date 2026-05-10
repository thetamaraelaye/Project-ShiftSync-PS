import { Global, Module } from '@nestjs/common';
import { FileEntity } from '@utils';
import { FileConfig, PrismaConfig } from '@configs';
import { S3Entity } from './utils/file/s3.file';

@Global()
@Module({
  providers: [PrismaConfig, S3Entity, FileConfig, FileEntity],
  exports: [PrismaConfig, FileEntity],
})
export class GlobalModule {}
