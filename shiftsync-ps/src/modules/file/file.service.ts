import { Injectable } from '@nestjs/common';
import { PrismaConfig } from '@configs';
import { FileEntity } from '@utils';

@Injectable()
export class FileService {
  constructor(
    private readonly fileEntity: FileEntity,
    private readonly prisma: PrismaConfig,
  ) {}

  async upload(file: Express.Multer.File, user?) {
    try {
      const uploadResult = await this.fileEntity.fileUpload(file);

      const persitFilePayload = {
        key: uploadResult.Key,
        type: file.mimetype,
        url: uploadResult.Location,
        ...(user && { userId: user.id }),
      };

      // Persit file record
      await this.saveFileRecord(persitFilePayload);

      return {
        message: 'File uploaded',
        data: {
          url: uploadResult.Location,
          mimetype: file.mimetype,
        },
      };
    } catch (e) {
      throw e;
    }
  }

  async multiUploads(files: Express.Multer.File[], user?) {
    try {
      const mapUploadResult = await Promise.all(
        files.map(async (file) => {
          const uploadResult = await this.fileEntity.fileUpload(file);

          const persitFilePayload = {
            key: uploadResult.key,
            type: file.mimetype,
            url: uploadResult.Location,
            ...(user && { userId: user.id }),
          };

          // Persit file record
          await this.saveFileRecord(persitFilePayload);

          return {
            url: uploadResult.Location,
            mimetype: file.mimetype,
          };
        }),
      );

      return { message: 'Files uploaded', data: mapUploadResult };
    } catch (e) {
      throw e;
    }
  }

  private async saveFileRecord(data: {
    key: string;
    extension?: string;
    type?: string;
    userId?: string;
  }) {
    try {
      const fileRecord = await this.prisma.file.create({
        data: {
          key: data.key,
          ...(data?.extension && { extension: data.extension }),
          ...(data?.type && { type: data.type }),
          ...(data?.userId && { userId: data.userId }),
        },
      });
      return fileRecord;
    } catch (e) {
      throw e;
    }
  }
}
