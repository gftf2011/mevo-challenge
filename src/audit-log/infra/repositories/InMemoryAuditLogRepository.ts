import { AuditLogRepository } from "../../domain/repositories/AuditLogRepository";
import { AuditLogEntity } from "../../domain/entities/AuditLogEntity";

export class InMemoryAuditLogRepository implements AuditLogRepository<AuditLogEntity> {
    private static instance: InMemoryAuditLogRepository;
    private auditLogs: AuditLogEntity[] = [];

    private constructor() {}
    
    static create(): InMemoryAuditLogRepository {
        if (!InMemoryAuditLogRepository.instance) {
            InMemoryAuditLogRepository.instance = new InMemoryAuditLogRepository();
        }
        return InMemoryAuditLogRepository.instance;
    }
    
    public async save(auditLog: AuditLogEntity): Promise<void> {
        this.auditLogs.push(auditLog);
    }
}