import express, { NextFunction, Request, Response } from 'express';
import { ChildProcess, fork } from 'child_process';
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
    if (allowedMimetypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'));
    }
};

const upload = multer({ storage, fileFilter });

const makePrepareForUploadUseCase = () => {
    let useCase: PrepareForUploadUseCase;
    let initialized = false;
    
    return (): PrepareForUploadUseCase => {
        if (!initialized) {
            useCase = new PrepareForUploadUseCase(new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient()));
            initialized = true;
        }
        return useCase;
    }
}

const makeRetrieveUploadStatusUseCase = () => {
    let useCase: RetrieveUploadStatusUseCase;
    let initialized = false;
    
    return (): RetrieveUploadStatusUseCase => {
        if (!initialized) {
            useCase = new RetrieveUploadStatusUseCase(new ElasticsearchUploadStatusRepository(ElasticsearchConnection.getInstance().getClient()));
            initialized = true;
        }
        return useCase;
    }
}

const getRetrieveUploadStatusUseCase = makeRetrieveUploadStatusUseCase();
const getPrepareForUploadUseCase = makePrepareForUploadUseCase();

let apmAgent: Agent = ApmServerProvider.start({ serviceName: 'mevo-challenge-api' });

const childs: Map<number, ChildProcess> = new Map();

const backgroundJob = (id: string, ip: string, filepath: string, batchSize: number) => {
    const child = fork("./dist/job.js");
    childs.set(child.pid!, child);
    child.send({ id, ip, filepath, batchSize });
    child.on("message", (message: { type: string }) => {
        if (message.type === "done") {
          child.kill();
        } else if (message.type === "failed") {
          child.kill();
        }
    });
    child.on("close", () => childs.delete(child.pid!));
};

const getLogJob = () => {
    let child: ChildProcess;
    let initialized = false;

    return {
        send: (id: string, type: "HTTP" | "JOB", resource: string, status: "ERROR" | "SUCCESS" | "PROCESSING" | "CLOSED", ip: string) => {
            if (!initialized) {
                initialized = true;
                child = fork("./dist/logJob.js");
                childs.set(child.pid!, child);
                child.on("close", () => childs.delete(child.pid!));
            }
            child.send({ id, type, resource, status, ip });
        },
        stop: () => {
            child.kill();
        }
    }
};

const logJob = getLogJob();

const fileExtensionValidationMiddleware = (err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err) return res.status(400).json({ error: 'Invalid file type' });
    return next();
}

const childLimitMiddleware = async (_req: Request, _res: Response, next: NextFunction) => {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    while (childs.size >= 21) await sleep(15);
    return next();
}

app.post('/api/prescriptions/upload', childLimitMiddleware, upload.single('file'), fileExtensionValidationMiddleware, async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('POST:api/prescriptions/upload', 'request', { startTime: Date.now() });

    if (!req.file) {
        transaction.end('error', Date.now());
        logJob.send(crypto.randomUUID(), 'HTTP', 'POST - /api/prescriptions/upload', 'ERROR', req.ip?.toString() || 'unknown');
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }

    const id = req.file.filename.replace('.csv', '');
    const prepareForUploadUseCase = getPrepareForUploadUseCase();
    const response = await prepareForUploadUseCase.execute({ upload_id: id });

    backgroundJob(id, req.ip?.toString() || 'unknown', req.file.path, 4000);
    logJob.send(crypto.randomUUID(), 'HTTP', 'POST - /api/prescriptions/upload', 'SUCCESS', req.ip?.toString() || 'unknown');
    transaction.end('success', Date.now());

    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', async (req: Request, res: Response) => {
    const transaction = apmAgent.startTransaction('GET:api/prescriptions/upload/:id', 'request', { startTime: Date.now() });

    const { id } = req.params;
    const retrieveUploadStatusUseCase = getRetrieveUploadStatusUseCase();
    const response = await retrieveUploadStatusUseCase.execute({ upload_id: id });
    if (!response) {
        transaction.end('error', Date.now());
        logJob.send(crypto.randomUUID(), 'HTTP', 'GET - /api/prescriptions/upload/:id', 'ERROR', req.ip?.toString() || 'unknown');
        return res.status(404).json({ error: `upload: ${id} - does not exists` });
    }

    logJob.send(crypto.randomUUID(), 'HTTP', 'GET - /api/prescriptions/upload/:id', 'SUCCESS', req.ip?.toString() || 'unknown');
    transaction.end('success', Date.now());

    return res.status(200).json(response);
});

export default app;
