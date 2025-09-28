import { Client } from "@elastic/elasticsearch";
import { AuditLogRepository } from "../../domain/repositories/AuditLogRepository";
import { AuditLogEntity } from "../../domain/entities/AuditLogEntity";

export class ElasticsearchAuditLogRepository implements AuditLogRepository<AuditLogEntity> {
    private readonly indexName = 'audit-logs';

    constructor(private readonly client: Client) {}

    public async save(auditLog: AuditLogEntity): Promise<void> {
        await this.client.index({
            index: this.indexName,
            id: auditLog.id,
            document: auditLog.toJSON()
        });
    }
}