import express, { Request, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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

app.post('/api/prescriptions/upload', upload.single('file'), async (req: Request, res: Response) => {
    console.log(req.file);
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }
    const id = req.file.filename.replace('.csv', '');

    const response = {
        upload_id: id,
        status: 'completed',
        total_records: 0,
        processed_records: 0,
        valid_records: 0,
        errors: [],
    };

    return res.status(201).json(response);
});

app.get('/api/prescriptions/upload/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    
    return res.status(200).json({});
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
