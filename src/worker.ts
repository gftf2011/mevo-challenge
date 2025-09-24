import csv from 'csv-parser';
import fs from 'fs';

import { InMemoryPrescriptionRepository } from "./prescription/infra/repositories/InMemoryPrescriptionRepository";
import { SaveBatchPrescriptionsUseCase } from "./prescription/use-cases/SaveBatchPrescriptionsUseCase";
import { InMemoryUploadStatusRepository } from "./upload-status/infra/repositories/InMemoryUploadStatusRepository";
import { FinishUploadUseCase } from "./upload-status/use-cases/FinishUploadUseCase";
import { StartUploadUseCase } from "./upload-status/use-cases/StartUploadUseCase";
import { UpdateUploadStatusUseCase } from "./upload-status/use-cases/UpdateUploadStatusUseCase";

process.on("message", async (message: { id: string, filepath: string }) => {
    const makeStartUploadUseCase = (): StartUploadUseCase => {
        const uploadStatusRepository = InMemoryUploadStatusRepository.create();
        return new StartUploadUseCase(uploadStatusRepository);
    }
    
    const makeFinishUploadUseCase = (): FinishUploadUseCase => {
        const uploadStatusRepository = InMemoryUploadStatusRepository.create();
        return new FinishUploadUseCase(uploadStatusRepository);
    }
    
    const makeUpdateUploadStatusUseCase = (): UpdateUploadStatusUseCase => {
        const uploadStatusRepository = InMemoryUploadStatusRepository.create();
        return new UpdateUploadStatusUseCase(uploadStatusRepository);
    }
    
    const makeSaveBatchPrescriptionsUseCase = (): SaveBatchPrescriptionsUseCase => {
        const prescriptionRepository = InMemoryPrescriptionRepository.create();
        return new SaveBatchPrescriptionsUseCase(prescriptionRepository);
    }
    
    const startUploadUseCase = makeStartUploadUseCase();
    const saveBatchPrescriptionsUseCase = makeSaveBatchPrescriptionsUseCase();
    const updateUploadStatusUseCase = makeUpdateUploadStatusUseCase();
    const finishUploadUseCase = makeFinishUploadUseCase();

    await startUploadUseCase.execute({ upload_id: message.id });

    const batchSize = 100;
    let current_line = 1;
    let batch: any[] = [];

    const processBatch = async (batch: any[]) => {
        const { valid_records, processed_records, errors } = await saveBatchPrescriptionsUseCase.execute({ prescriptions: batch, current_line });
        await updateUploadStatusUseCase.execute({ upload_id: message.id, valid_records, processed_records, errors });
        current_line += batch.length;
    };

    const stream  = fs.createReadStream(message.filepath).pipe(csv());
    stream.on("data", async (row) => {
        batch.push(row);
        if (batch.length >= batchSize) {
            stream.pause();
            await processBatch(batch);
            stream.resume();
            batch = [];
        }
    });
    stream.on("end", async () => {
        if (batch.length > 0) {
            await processBatch(batch);
        }
        await finishUploadUseCase.execute({ upload_id: message.id });
        process.send?.({ type: "done" });
    });
});