import { UploadStatusEntity } from "../entities/UploadStatusEntity";

export interface UploadStatusRepository<T extends UploadStatusEntity> {
    create(entity: T): Promise<void>;
    update(entity: T): Promise<void>;
    findByUploadId(uploadId: string, withErrors: boolean): Promise<T | null>;
}
