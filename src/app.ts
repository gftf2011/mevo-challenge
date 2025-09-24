import express, { Request, Response } from 'express';
import csv from 'csv-parser';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { InMemoryPrescriptionRepository } from './prescription/infra/repositories/InMemoryPrescriptionRepository';
import { SaveBatchPrescriptionsUseCase } from './prescription/use-cases/SaveBatchPrescriptionsUseCase';
import { StartUploadUseCase } from './upload-status/use-cases/StartUploadUseCase';
import { InMemoryUploadStatusRepository } from './upload-status/infra/repositories/InMemoryUploadStatusRepository';
import { FinishUploadUseCase } from './upload-status/use-cases/FinishUploadUseCase';
import { UpdateUploadStatusUseCase } from './upload-status/use-cases/UpdateUploadStatusUseCase';
import { PrepareForUploadUseCase } from './upload-status/use-cases/PrepareForUploadUseCase';
import { RetrieveUploadStatusUseCase } from './upload-status/use-cases/RetrieveUploadStatusUseCase';

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
  filename: (_req, file, cb) => {
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

const makePrepareForUploadUseCase = (): PrepareForUploadUseCase => {
    const uploadStatusRepository = InMemoryUploadStatusRepository.create();
    return new PrepareForUploadUseCase(uploadStatusRepository);
}

const makeSaveBatchPrescriptionsUseCase = (): SaveBatchPrescriptionsUseCase => {
    const prescriptionRepository = InMemoryPrescriptionRepository.create();
    return new SaveBatchPrescriptionsUseCase(prescriptionRepository);
}

const makeRetrieveUploadStatusUseCase = (): RetrieveUploadStatusUseCase => {
    const uploadStatusRepository = InMemoryUploadStatusRepository.create();
    return new RetrieveUploadStatusUseCase(uploadStatusRepository);
}

const processFile = async (id: string, filepath: string): Promise<void> => {
    const startUploadUseCase = makeStartUploadUseCase();
    const saveBatchPrescriptionsUseCase = makeSaveBatchPrescriptionsUseCase();
    const updateUploadStatusUseCase = makeUpdateUploadStatusUseCase();
    const finishUploadUseCase = makeFinishUploadUseCase();

    await startUploadUseCase.execute({ upload_id: id });

    const batchSize = 100;
    let current_line = 1;
    let batch: any[] = [];

    const processBatch = async (batch: any[]) => {
        const { valid_records, processed_records, errors } = await saveBatchPrescriptionsUseCase.execute({ prescriptions: batch, current_line });
        await updateUploadStatusUseCase.execute({ upload_id: id, valid_records, processed_records, errors });
        current_line += batch.length;
    };

    const stream  = fs.createReadStream(filepath).pipe(csv());
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
        await finishUploadUseCase.execute({ upload_id: id });
    });
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }
    const id = req.file.filename.replace('.csv', '');
    const prepareForUploadUseCase = makePrepareForUploadUseCase();
    const response = await prepareForUploadUseCase.execute({ upload_id: id });

    processFile(id, req.file.path);

    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const retrieveUploadStatusUseCase = makeRetrieveUploadStatusUseCase();
    const response = await retrieveUploadStatusUseCase.execute({ upload_id: id });
    return res.status(200).json(response);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
