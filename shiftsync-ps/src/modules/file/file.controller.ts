import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { FileService } from './file.service';

// File upload endpoints are available but excluded from API documentation.
// Not required for the shift scheduling domain — retained for future extensibility.
@ApiExcludeController()
@Controller('files')
export class FileController {
  constructor(private file: FileService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.file.upload(file);
  }

  @Post('multi-uploads')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.file.multiUploads(files);
  }
}
