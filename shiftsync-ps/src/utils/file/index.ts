import { Injectable, OnModuleInit } from '@nestjs/common';
import { FileConfig } from '@configs';
import { S3Entity } from './s3.file';
import { ExceptionFactory } from '@utils';
import { FileStorage } from './file.interface';

@Injectable()
export class FileEntity implements OnModuleInit {
  private fileService: FileStorage;

  constructor(
    private fileConfigService: FileConfig,
    private s3Entity: S3Entity,
  ) {}

  onModuleInit() {
    const provider = this.fileConfigService.getProvider();
    switch (provider) {
      case 'aws-s3':
        this.fileService = this.s3Entity;
        break;
      case 'gcp-bucket':
        break;
      default:
        // upload on server
        throw ExceptionFactory.badRequest('Invalid file provider');
    }
  }

  async fileUpload(file) {
    return this.fileService.upload(file);
  }

  async fileRemove(file) {
    return this.fileService.delete(file);
  }
}
