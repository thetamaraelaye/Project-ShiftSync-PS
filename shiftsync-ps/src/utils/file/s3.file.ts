import { Injectable, Logger } from '@nestjs/common';
import { FileStorage } from './file.interface';
import { FileConfig } from '@configs';
import { DeleteObjectCommand, S3 } from '@aws-sdk/client-s3';
import { ExceptionHandler } from '../exception.util';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class S3Entity implements FileStorage {
  private readonly logger = new Logger(S3Entity.name, { timestamp: true });
  private s3;
  constructor(private readonly fileConfig: FileConfig) {
    this.s3 = this.fileConfig.getFileClient() as S3;
  }

  async upload(file: Express.Multer.File): Promise<any> {
    const { originalname } = file;

    const cmd = new Upload({
      client: this.s3,
      params: {
        Bucket: this.fileConfig.getBucket(),
        Key: `${originalname.toString()}${new Date().toISOString()}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: 'inline',
      },
    });

    try {
      this.logger.log('S3 file upload cmd sent');
      return await cmd.done();
    } catch (e) {
      this.logger.log('S3 file upload failed');
      console.error('S3 file upload failed', e);
      ExceptionHandler.handle(e);
    }
  }

  async delete(key: string): Promise<any> {
    const params = {
      Bucket: this.fileConfig.getBucket(),
      Key: key,
    };

    try {
      const cmd = new DeleteObjectCommand(params);
      this.logger.log('S3 file delete cmd sent');
      return await this.s3.send(cmd);
    } catch (e) {
      this.logger.log('S3 file delection failed');
      console.error('S3 file delection failed', e);
      ExceptionHandler.handle(e);
    }
  }
}
