import csv from 'csv-parser';
import fs from 'fs';
import { Stream } from 'stream';

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

    const stream = fs.createReadStream(message.filepath).pipe(csv());

    const processBatch = async (stream: Stream.Transform, batch: any[]) => {
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

    const onStreamOperation = (stream: Stream.Transform) => {
        return async (data: any): Promise<void> => {
            batch.push(data);
            if (batch.length >= batchSize) {
                stream.pause();
                console.log(`upload: ${message.id} - stream paused to batch processing`);
                await processBatch(stream, batch);
                stream.resume();
                console.log(`upload: ${message.id} - stream resumed`);
                batch = [];
            }
        }
    };

    const errorStreamOperation = (stream: Stream.Transform) => {
        return async (_error: Error): Promise<void> => {
            await failedUploadUseCase.execute({ upload_id: message.id });
            stream.destroy();
            ElasticsearchConnection.getInstance().close();
            console.log(`upload: ${message.id} - failed due to file corruption`);
            process.send?.({ type: "failed" });
        }
    };

    const endStreamOperation = (stream: Stream.Transform) => {
        return async (): Promise<void> => {
            if (batch.length > 0) await processBatch(stream, batch);
            await finishUploadUseCase.execute({ upload_id: message.id });
            ElasticsearchConnection.getInstance().close();
            console.log(`upload: ${message.id} - ended successfully`);
            process.send?.({ type: "done" });
        }
    };

    const processStream = async (stream: Stream.Transform, operations: {
        on: (stream: Stream.Transform) => (data: any) => Promise<void>;
        error: (stream: Stream.Transform) => (error: Error) => Promise<void>;
        end: (stream: Stream.Transform) => () => Promise<void>;
    }) => {
        stream.on("data", operations.on(stream));
        stream.on("error", operations.error(stream));
        stream.on("end", operations.end(stream));
    };

    processStream(stream, {
        on: onStreamOperation,
        error: errorStreamOperation,
        end: endStreamOperation,
    });
});
