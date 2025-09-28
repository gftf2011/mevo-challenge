import { AuditLogEntity } from "../entities/AuditLogEntity";

export interface AuditLogRepository<T extends AuditLogEntity> {
    save(auditLog: T): Promise<void>;
}
