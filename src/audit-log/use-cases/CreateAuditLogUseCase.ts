import { UseCase } from "../../common/use-cases/UseCase";
import { AuditLogEntity } from "../domain/entities/AuditLogEntity";
import { AuditLogRepository } from "../domain/repositories/AuditLogRepository";

export type Input = {
    id: string;
    type: "HTTP" | "JOB";
    resource: string;
    status: "SUCCESS" | "PROCESSING" | "ERROR" | "CLOSED";
    ip: string;
};

export type Output = void;

export class CreateAuditLogUseCase implements UseCase<Input, Output> {
    constructor(private readonly auditLogRepository: AuditLogRepository<AuditLogEntity>) {}

    public async execute(input: Input): Promise<Output> {
        const auditLog = AuditLogEntity.create(input);
        await this.auditLogRepository.save(auditLog);
    }
}