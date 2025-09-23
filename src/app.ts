import express, { Request, Response } from 'express';
import csv from 'csv-parser';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { NotificationHandler } from './common/notifications/NotificationHandler.js';
import { PrescriptionEntity } from './prescription/domain/entities/PrescriptionEntity.js';
import { PrescriptionDomainError } from './prescription/domain/errors/PrescriptionDomainError.js';

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

type Report = {
    upload_id: string,
    status: 'processing' | 'completed',
    total_records: number,
    processed_records: number,
    valid_records: number,
    errors: any[],
    prescriptions: any[],
}

const data: Map<string, Report> = new Map<string, Report>();

const processFile = (id: string, filepath: string): void => {
    let line = 1;
    const report = data.get(id)!;

    fs.createReadStream(filepath)
        .pipe(csv())
        .on("data", (row) => {
            line++;

            const prescription = PrescriptionEntity.create(row);
            const notificationHandler = NotificationHandler.createEmpty();

            prescription.validate(notificationHandler);

            if (!notificationHandler.hasErrors()) {
                report.prescriptions.push(prescription);
                report.valid_records++;
            } else {
                report.processed_records++;
                const errors = (notificationHandler.getErrors() as PrescriptionDomainError[]).map(error => ({
                    message: error.message,
                    field: error.property,
                    line: line,
                    value: error.value,
                }));
                report.errors.push(...errors);
            }
        })
        .on("end", () => {
            report.status = 'completed';
            console.log(report);
            console.log("CSV file successfully processed");
        });
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }
    const id = req.file.filename.replace('.csv', '');
    const report: Report = {
        upload_id: id,
        status: 'processing',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        errors: [],
        prescriptions: [],
    };

    data.set(id, report);

    processFile(id, req.file.path);

    return res.status(201).json(report);
});

app.get('/api/prescriptions/upload/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    
    return res.status(200).json({});
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
