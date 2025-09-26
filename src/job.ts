import csv from 'csv-parser';
import fs from 'fs';

import { ElasticsearchConnection } from './common/infra/db/ElasticsearchConnection';
import { ElasticsearchPrescriptionRepository } from './prescription/infra/repositories/ElasticsearchPrescriptionRepository';
import { SaveBatchPrescriptionsUseCase } from './prescription/use-cases/SaveBatchPrescriptionsUseCase';
import { StartUploadUseCase } from './upload-status/use-cases/StartUploadUseCase';
import { ElasticsearchUploadStatusRepository } from './upload-status/infra/repositories/ElasticsearchUploadStatusRepository';
import { FinishUploadUseCase } from './upload-status/use-cases/FinishUploadUseCase';
import { UpdateUploadStatusUseCase } from './upload-status/use-cases/UpdateUploadStatusUseCase';
import { FailedUploadUseCase } from './upload-status/use-cases/FailedUploadUseCase';

const makeStartUploadUseCase = (): StartUploadUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new StartUploadUseCase(uploadStatusRepository);
}

const makeFinishUploadUseCase = (): FinishUploadUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new FinishUploadUseCase(uploadStatusRepository);
}

const makeUpdateUploadStatusUseCase = (): UpdateUploadStatusUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new UpdateUploadStatusUseCase(uploadStatusRepository);
}

const makeSaveBatchPrescriptionsUseCase = (): SaveBatchPrescriptionsUseCase => {
    const prescriptionRepository = new ElasticsearchPrescriptionRepository(ElasticsearchConnection.getInstance().getClient());
    return new SaveBatchPrescriptionsUseCase(prescriptionRepository);
}

const makeFailedUploadUseCase = (): FailedUploadUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new FailedUploadUseCase(uploadStatusRepository);
}

process.on("message", async (message: { id: string, filepath: string, batchSize: number }) => {
    await ElasticsearchConnection.connect();

    const startUploadUseCase = makeStartUploadUseCase();
    const saveBatchPrescriptionsUseCase = makeSaveBatchPrescriptionsUseCase();
    const updateUploadStatusUseCase = makeUpdateUploadStatusUseCase();
    const finishUploadUseCase = makeFinishUploadUseCase();
    const failedUploadUseCase = makeFailedUploadUseCase();

    await startUploadUseCase.execute({ upload_id: message.id });

    const batchSize = message.batchSize;
    let current_line = 1;
    let batch: any[] = [];

    const stream  = fs.createReadStream(message.filepath).pipe(csv());

    const processBatch = async (batch: any[]) => {
        try {
            const { valid_records, processed_records, errors } = await saveBatchPrescriptionsUseCase.execute({ prescriptions: batch, current_line });
            await updateUploadStatusUseCase.execute({ upload_id: message.id, valid_records, processed_records, errors });
            current_line += batch.length;
            console.log(`upload: ${message.id} - batch processed successfully`);
        } catch (error) {
            console.log(`upload: ${message.id} - error processing batch`, error);
            stream.emit("error", new Error("Error processing batch"));
        }
    };

    stream.on("data", async (row) => {
        batch.push(row);
        if (batch.length >= batchSize) {
            stream.pause();
            console.log(`upload: ${message.id} - stream paused to batch processing`);
            await processBatch(batch);
            stream.resume();
            console.log(`upload: ${message.id} - stream resumed`);
            batch = [];
        }
    });
    stream.on("error", async (_) => {
        await failedUploadUseCase.execute({ upload_id: message.id });
        stream.destroy();
        ElasticsearchConnection.getInstance().close();
        console.log(`upload: ${message.id} - failed due to file corruption`);
    });
    stream.on("end", async () => {
        if (batch.length > 0) {
            await processBatch(batch);
        }
        await finishUploadUseCase.execute({ upload_id: message.id });
        ElasticsearchConnection.getInstance().close();
        console.log(`upload: ${message.id} - ended successfully`);
    });
});

