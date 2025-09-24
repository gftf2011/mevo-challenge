import { UploadStatusEntity } from "../entities/UploadStatusEntity.js";

export interface UploadStatusRepository<T extends UploadStatusEntity> {
    create(entity: T): Promise<void>;
    update(entity: T): Promise<void>;
    findByUploadId(uploadId: string): Promise<T | null>;
}
