import express, { Request, Response } from 'express';
import { fork } from 'child_process';
// import csv from 'csv-parser';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { ElasticsearchConnection } from './common/infra/db/ElasticsearchConnection';
// import { ElasticsearchPrescriptionRepository } from './prescription/infra/repositories/ElasticsearchPrescriptionRepository';
// import { SaveBatchPrescriptionsUseCase } from './prescription/use-cases/SaveBatchPrescriptionsUseCase';
// import { StartUploadUseCase } from './upload-status/use-cases/StartUploadUseCase';
import { ElasticsearchUploadStatusRepository } from './upload-status/infra/repositories/ElasticsearchUploadStatusRepository';
// import { FinishUploadUseCase } from './upload-status/use-cases/FinishUploadUseCase';
// import { UpdateUploadStatusUseCase } from './upload-status/use-cases/UpdateUploadStatusUseCase';
import { PrepareForUploadUseCase } from './upload-status/use-cases/PrepareForUploadUseCase';
import { RetrieveUploadStatusUseCase } from './upload-status/use-cases/RetrieveUploadStatusUseCase';
// import { FailedUploadUseCase } from './upload-status/use-cases/FailedUploadUseCase';

const app = express();
app.use(express.json());

// Ensure tmp directory exists
const tmpDir = path.resolve('tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Multer configuration for single CSV upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tmpDir);
  },
  filename: (_req, _file, cb) => {
    const id = crypto.randomUUID();
    cb(null, `${id}.csv`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const allowedMimetypes = ['text/csv'];
    if (allowedMimetypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
};

const upload = multer({ storage, fileFilter });

// const makeStartUploadUseCase = (): StartUploadUseCase => {
//     const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
//     return new StartUploadUseCase(uploadStatusRepository);
// }

// const makeFinishUploadUseCase = (): FinishUploadUseCase => {
//     const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
//     return new FinishUploadUseCase(uploadStatusRepository);
// }

// const makeUpdateUploadStatusUseCase = (): UpdateUploadStatusUseCase => {
//     const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
//     return new UpdateUploadStatusUseCase(uploadStatusRepository);
// }

const makePrepareForUploadUseCase = (): PrepareForUploadUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new PrepareForUploadUseCase(uploadStatusRepository);
}

// const makeSaveBatchPrescriptionsUseCase = (): SaveBatchPrescriptionsUseCase => {
//     const prescriptionRepository = new ElasticsearchPrescriptionRepository(ElasticsearchConnection.getInstance().getClient());
//     return new SaveBatchPrescriptionsUseCase(prescriptionRepository);
// }

const makeRetrieveUploadStatusUseCase = (): RetrieveUploadStatusUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new RetrieveUploadStatusUseCase(uploadStatusRepository);
}

// const makeFailedUploadUseCase = (): FailedUploadUseCase => {
//     const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
//     return new FailedUploadUseCase(uploadStatusRepository);
// }

// const processFile = async (id: string, filepath: string): Promise<void> => {
//     const startUploadUseCase = makeStartUploadUseCase();
//     const saveBatchPrescriptionsUseCase = makeSaveBatchPrescriptionsUseCase();
//     const updateUploadStatusUseCase = makeUpdateUploadStatusUseCase();
//     const finishUploadUseCase = makeFinishUploadUseCase();
//     const failedUploadUseCase = makeFailedUploadUseCase();

//     await startUploadUseCase.execute({ upload_id: id });

//     const batchSize = 100;
//     let current_line = 1;
//     let batch: any[] = [];

//     const stream  = fs.createReadStream(filepath).pipe(csv());

//     const processBatch = async (batch: any[]) => {
//         try {
//             const { valid_records, processed_records, errors } = await saveBatchPrescriptionsUseCase.execute({ prescriptions: batch, current_line });
//             await updateUploadStatusUseCase.execute({ upload_id: id, valid_records, processed_records, errors });
//             current_line += batch.length;
//             console.log(`upload: ${id} - batch processed successfully`);
//         } catch (error) {
//             console.log(`upload: ${id} - error processing batch`, error);
//             stream.emit("error", new Error("Error processing batch"));
//         }
//     };

//     stream.on("data", async (row) => {
//         batch.push(row);
//         if (batch.length >= batchSize) {
//             stream.pause();
//             console.log(`upload: ${id} - stream paused to batch processing`);
//             await processBatch(batch);
//             stream.resume();
//             console.log(`upload: ${id} - stream resumed`);
//             batch = [];
//         }
//     });
//     stream.on("error", async (_) => {
//         await failedUploadUseCase.execute({ upload_id: id });
//         stream.destroy();
//         console.log(`upload: ${id} - failed due to file corruption`);
//     });
//     stream.on("end", async () => {
//         if (batch.length > 0) {
//             await processBatch(batch);
//         }
//         await finishUploadUseCase.execute({ upload_id: id });
//         console.log(`upload: ${id} - ended successfully`);
//     });
// };

const backgroundJob = (id: string, filepath: string, batchSize: number) => {
    const child = fork("./dist/job.js");
  
    child.send({ id, filepath, batchSize });
    child.on("message", (message: { type: string }) => {
        if (message.type === "done") {
          console.log("Upload completed");
          child.kill();
        }
    });
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }
    const id = req.file.filename.replace('.csv', '');
    const prepareForUploadUseCase = makePrepareForUploadUseCase();
    const response = await prepareForUploadUseCase.execute({ upload_id: id });

    backgroundJob(id, req.file.path, 100);

    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const retrieveUploadStatusUseCase = makeRetrieveUploadStatusUseCase();
    const response = await retrieveUploadStatusUseCase.execute({ upload_id: id });
    return res.status(200).json(response);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, async () => {
    await ElasticsearchConnection.connect();
    console.log(`Server listening on http://localhost:${port}`);
});
