import { UploadStatusRepository } from "../../domain/repositories/UploadStatusRepository";
import { UploadStatusEntity } from "../../domain/entities/UploadStatusEntity";

export class InMemoryUploadStatusRepository implements UploadStatusRepository<UploadStatusEntity> {
    private static instance: InMemoryUploadStatusRepository;
    private uploadStatuses: UploadStatusEntity[] = [];

    private constructor() {}
    
    static create(): InMemoryUploadStatusRepository {
        if (!InMemoryUploadStatusRepository.instance) {
            InMemoryUploadStatusRepository.instance = new InMemoryUploadStatusRepository();
        }
        return InMemoryUploadStatusRepository.instance;
    }
    
    public async create(entity: UploadStatusEntity): Promise<void> {
        this.uploadStatuses.push(entity);
    }

    public async update(entity: UploadStatusEntity): Promise<void> {
        this.uploadStatuses.forEach((uploadStatus, index: number, array) => {
            if (uploadStatus.upload_id === entity.upload_id) {
              array[index] = entity;
            }
        });
    }

    public async findByUploadId(uploadId: string): Promise<UploadStatusEntity | null> {
        return this.uploadStatuses.find((uploadStatus) => uploadStatus.upload_id === uploadId) || null;
    }
}