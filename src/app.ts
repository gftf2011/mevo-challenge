import express, { Request, Response } from 'express';
import { fork } from 'child_process';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import apm from 'elastic-apm-node';

import { ApmServerProvider } from './common/infra/providers/ApmServerProvider';
import { ElasticsearchConnection } from './common/infra/db/ElasticsearchConnection';
import { ElasticsearchUploadStatusRepository } from './upload-status/infra/repositories/ElasticsearchUploadStatusRepository';
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

const makePrepareForUploadUseCase = (): PrepareForUploadUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new PrepareForUploadUseCase(uploadStatusRepository);
}

const makeRetrieveUploadStatusUseCase = (): RetrieveUploadStatusUseCase => {
    const uploadStatusRepository = new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient());
    return new RetrieveUploadStatusUseCase(uploadStatusRepository);
}

const backgroundJob = (id: string, filepath: string, batchSize: number) => {
    const child = fork("./dist/job.js");
  
    child.send({ id, filepath, batchSize });
    child.on("message", (message: { type: string }) => {
        if (message.type === "done") {
          console.log("Upload completed");
          child.kill();
        } else if (message.type === "failed") {
          console.log("Upload failed");
          child.kill();
        }
    });
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
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
    if (!response) return res.status(404).json({ error: `upload: ${id} - does not exists` });
    return res.status(200).json(response);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, async () => {
    ApmServerProvider.getInstance().start();
    await ElasticsearchConnection.connect();
    console.log(`Server listening on http://localhost:${port}`);
});
