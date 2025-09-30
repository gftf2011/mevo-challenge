import { ElasticsearchConnection } from './common/infra/db/ElasticsearchConnection';
import { CreateAuditLogUseCase } from './audit-log/use-cases/CreateAuditLogUseCase';
import { ElasticsearchAuditLogRepository } from './audit-log/infra/repositories/ElasticsearchAuditLogRepository';

const makeCreateAuditLogUseCase = (): CreateAuditLogUseCase => {
    const auditLogRepository = new ElasticsearchAuditLogRepository(ElasticsearchConnection.getInstance().getClient());
    return new CreateAuditLogUseCase(auditLogRepository);
}

let connected = false;
const BATCH_SIZE = 10;
const MAX_TIME = 200;
let batch: {
    id: string,
    type: "HTTP" | "JOB",
    resource: string, status: "ERROR" | "SUCCESS" | "PROCESSING" | "CLOSED",
    ip: string
}[] = [];
let timer: NodeJS.Timeout;

process.on("message", async (message: {
    id: string,
    type: "HTTP" | "JOB",
    resource: string, status: "ERROR" | "SUCCESS" | "PROCESSING" | "CLOSED",
    ip: string
}) => {
    if (!connected) {
        await ElasticsearchConnection.connect();
        connected = true;
    }

    const flushBatch = async (): Promise<void> => {
        if (batch.length === 0) return;
        const createAuditLogUseCase = makeCreateAuditLogUseCase();
        await Promise.all(batch.map((message) => {
            createAuditLogUseCase.execute({
                id: message.id,
                type: message.type,
                resource: message.resource,
                status: message.status,
                ip: message.ip
            });
        }));
        batch = [];
        clearTimeout(timer);
        timer = undefined as any;
    };

    const addToBatch = async () => {
        batch.push(message);
        if (batch.length >= BATCH_SIZE) {
            await flushBatch();
            return;
        }

        if (!timer) {
            timer = setTimeout(flushBatch, MAX_TIME);
        }
    };

    await addToBatch();
});