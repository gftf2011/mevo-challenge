import { UseCase } from "../../common/use-cases/UseCase";
import { UploadStatusEntity } from "../domain/entities/UploadStatusEntity";
import { UploadStatusRepository } from "../domain/repositories/UploadStatusRepository";

export type Input = {
    upload_id: string;
    processed_records: number;
    valid_records: number;
    errors: {
        message: string;
        field: string;
        line: number;
        value: string;
    }[];
};

export type Output = {
    upload_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total_records: number;
    processed_records: number;
    valid_records: number;
    errors: {
        message: string;
        field: string;
        line: number;
        value: string;
    }[];
};

export class UpdateUploadStatusUseCase implements UseCase<Input, Output> {
    constructor(private readonly uploadStatusRepository: UploadStatusRepository<UploadStatusEntity>) {}

    public async execute(input: Input): Promise<Output> {
        const { upload_id, processed_records, valid_records, errors } = input;

        const uploadStatus = await this.uploadStatusRepository.findByUploadId(upload_id, false);
        if (!uploadStatus) throw new Error('Upload status does not exists');

        const newTotalRecords = uploadStatus.total_records + processed_records;
        const newProcessedRecords = uploadStatus.processed_records + processed_records;
        const newValidRecords = uploadStatus.valid_records + valid_records;

        uploadStatus.updateTotalRecords(newTotalRecords);
        uploadStatus.updateProcessedRecords(newProcessedRecords);
        uploadStatus.updateValidRecords(newValidRecords);
        uploadStatus.addErrors(errors);

        await this.uploadStatusRepository.update(uploadStatus);

        return {
            upload_id: uploadStatus.upload_id,
            status: uploadStatus.status,
            total_records: uploadStatus.total_records,
            processed_records: uploadStatus.processed_records,
            valid_records: uploadStatus.valid_records,
            errors: uploadStatus.errors,
        };
    }
}