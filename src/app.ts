import express, { Request, Response } from 'express';
import csv from 'csv-parser';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { InMemoryPrescriptionRepository } from './prescription/infra/repositories/InMemoryPrescriptionRepository.js';
import { SaveBatchPrescriptionsUseCase } from './prescription/use-cases/SaveBatchPrescriptionsUseCase.js';

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

type ReportData = {
    upload_id: string,
    status: 'processing' | 'completed',
    total_records: number,
    processed_records: number,
    valid_records: number,
    errors: any[],
};

const reportDB: Map<string, ReportData> = new Map<string, ReportData>();

const makeSaveBatchPrescriptionsUseCase = (): SaveBatchPrescriptionsUseCase => {
    const prescriptionRepository = InMemoryPrescriptionRepository.create();
    return new SaveBatchPrescriptionsUseCase(prescriptionRepository);
}

const processFile = (id: string, filepath: string): void => {
    const report = reportDB.get(id)!;
    const saveBatchPrescriptionsUseCase = makeSaveBatchPrescriptionsUseCase();

    const batchSize = 100;
    let current_line = 1;
    let batch: any[] = [];

    const processBatch = async (batch: any[]) => {
        const { valid_records, processed_records, errors } = await saveBatchPrescriptionsUseCase.execute({ prescriptions: batch, current_line });
        report.valid_records += valid_records;
        report.processed_records += processed_records;
        report.total_records += processed_records;
        report.errors.push(...errors);
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
        if (batch.length > 0) await processBatch(batch);
        report.status = 'completed';
    });
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }
    const id = req.file.filename.replace('.csv', '');
    const report: ReportData = {
        upload_id: id,
        status: 'processing',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        errors: [],
    };

    reportDB.set(id, report);

    processFile(id, req.file.path);

    return res.status(201).json(report);
});

app.get('/api/prescriptions/upload/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    
    return res.status(200).json(reportDB.get(id)!);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
