import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from '@aws-sdk/client-s3';

@Injectable()
export class FileConfig {
  private fileClient: S3;
  private provider: string;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    this.initialize();
  }

  private initialize() {
    this.provider = this.config.get<string>('FILE_UPLOAD_PROVIDER', 'aws-s3');

    switch (this.provider) {
      case 'aws-s3':
        this.fileClient = new S3({
          credentials: {
            accessKeyId: this.config.get<string>('AWS_ACCESS_KEY'),
            secretAccessKey: this.config.get<string>('AWS_SECRET_KEY'),
          },
          forcePathStyle: false,
          region: this.config.get<string>('AWS_S3_REGION'),
        });
        this.bucket = this.config.get<string>('AWS_S3_BUCKET');
        break;

      case 'gcp':
        // GCP setup
        break;

      case 'cloudinary':
        // Cloudinary setup
        break;

      default:
        throw new Error(`Invalid file upload provider: ${this.provider}`);
    }
  }

  getFileClient() {
    return this.fileClient;
  }

  getBucket() {
    return this.bucket;
  }

  getProvider() {
    return this.provider;
  }
}
