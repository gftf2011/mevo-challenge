import express, { NextFunction, Request, Response } from 'express';
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
import { ElasticsearchAuditLogRepository } from './audit-log/infra/repositories/ElasticsearchAuditLogRepository';
import { CreateAuditLogUseCase } from './audit-log/use-cases/CreateAuditLogUseCase';

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
    if (allowedMimetypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'));
    }
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

const makeCreateAuditLogUseCase = (): CreateAuditLogUseCase => {
    const auditLogRepository = new ElasticsearchAuditLogRepository(ElasticsearchConnection.getInstance().getClient());
    return new CreateAuditLogUseCase(auditLogRepository);
}

let apmAgent: Agent = ApmServerProvider.start({ serviceName: 'mevo-challenge-api' });

const backgroundJob = (id: string, ip: string, filepath: string, batchSize: number) => {
    const child = fork("./dist/job.js");

    child.send({ id, ip, filepath, batchSize });
    child.on("message", (message: { type: string }) => {
        if (message.type === "done") {
          child.kill();
        } else if (message.type === "failed") {
          child.kill();
        }
    });
    child.on("close", async () => {
        console.log(`child process: ${child.pid} - closed`);
    });
};

const fileExtensionValidationMiddleware = (err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err) {
        return res.status(400).json({ error: 'Invalid file type' });
    }
    return next();
}

app.post('/api/prescriptions/upload', upload.single('file'), fileExtensionValidationMiddleware, async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('POST:api/prescriptions/upload', 'request', { startTime: Date.now() });

    const createAuditLogUseCase = makeCreateAuditLogUseCase();

    if (!req.file) {
        transaction.end('error', Date.now());

        await createAuditLogUseCase.execute({
            id: crypto.randomUUID(),
            type: 'HTTP',
            resource: 'POST - /api/prescriptions/upload',
            status: 'ERROR',
            ip: req.ip?.toString() || 'unknown'
        });

        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }

    const id = req.file.filename.replace('.csv', '');
    const prepareForUploadUseCase = makePrepareForUploadUseCase();
    const response = await prepareForUploadUseCase.execute({ upload_id: id });

    backgroundJob(id, req.ip?.toString() || 'unknown', req.file.path, 1000);

    transaction.end('success', Date.now());

    await createAuditLogUseCase.execute({
        id: crypto.randomUUID(),
        type: 'HTTP',
        resource: 'POST - /api/prescriptions/upload',
        status: 'SUCCESS',
        ip: req.ip?.toString() || 'unknown'
    });

    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('GET:api/prescriptions/upload/:id', 'request', { startTime: Date.now() });

    const createAuditLogUseCase = makeCreateAuditLogUseCase();

    const { id } = req.params;
    const retrieveUploadStatusUseCase = makeRetrieveUploadStatusUseCase();
    const response = await retrieveUploadStatusUseCase.execute({ upload_id: id });
    if (!response) {
        transaction.end('error', Date.now());

        await createAuditLogUseCase.execute({
            id: crypto.randomUUID(),
            type: 'HTTP',
            resource: 'GET - /api/prescriptions/upload/:id',
            status: 'ERROR',
            ip: req.ip?.toString() || 'unknown'
        });

        return res.status(404).json({ error: `upload: ${id} - does not exists` });
    }

    transaction.end('success', Date.now());

    await createAuditLogUseCase.execute({
        id: crypto.randomUUID(),
        type: 'HTTP',
        resource: 'GET - /api/prescriptions/upload/:id',
        status: 'SUCCESS',
        ip: req.ip?.toString() || 'unknown'
    });

    return res.status(200).json(response);
});

export default app;
