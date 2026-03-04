export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  upload(path: string, file: Buffer, contentType: string): Promise<string>;
  delete(path: string): Promise<void>;
  deleteMany(paths: string[]): Promise<void>;
}
