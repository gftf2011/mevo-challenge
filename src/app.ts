import express, { Request, Response } from 'express';
import { fork } from 'child_process';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Agent } from 'elastic-apm-node';

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

let apmAgent: Agent;

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
    child.on("close", () => console.log(`child process: ${child.pid} - closed`));
};

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('POST:api/prescriptions/upload', 'request', { startTime: Date.now() });
    
    if (!req.file) {
        transaction.end('error', Date.now());
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }

    const id = req.file.filename.replace('.csv', '');
    const prepareForUploadUseCase = makePrepareForUploadUseCase();
    const response = await prepareForUploadUseCase.execute({ upload_id: id });

    backgroundJob(id, req.file.path, 100);

    transaction.end('success', Date.now());
    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('GET:api/prescriptions/upload/:id', 'request', { startTime: Date.now() });
    
    const { id } = req.params;
    const retrieveUploadStatusUseCase = makeRetrieveUploadStatusUseCase();
    const response = await retrieveUploadStatusUseCase.execute({ upload_id: id });
    if (!response) {
        transaction.end('error', Date.now());
        return res.status(404).json({ error: `upload: ${id} - does not exists` });
    }

    transaction.end('success', Date.now());
    return res.status(200).json(response);
});

const port = Number(process.env.PORT || 3000);

app.listen(port, async () => {
    apmAgent = ApmServerProvider.start({ serviceName: 'mevo-challenge-api' });
    await ElasticsearchConnection.connect();
    console.log(`Server listening on http://localhost:${port}`);
});
