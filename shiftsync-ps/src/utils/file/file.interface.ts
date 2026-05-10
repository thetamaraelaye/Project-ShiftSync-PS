export interface FileStorage {
  upload(file: Express.Multer.File): Promise<any>;
  delete(key: string): Promise<any>;
}
