import { NotificationHandler } from "../../common/domain/notifications/NotificationHandler";
import { UseCase } from "../../common/use-cases/UseCase";
import { PrescriptionEntity } from "../domain/entities/PrescriptionEntity";
import { PrescriptionRepository } from "../domain/repositories/PrescriptionRepository";
import { PrescriptionDomainError } from "../domain/errors/PrescriptionDomainError";

export type Input = {
    prescriptions: {
        id: string;
        date: string;
        patient_cpf: string;
        doctor_crm: string;
        doctor_uf: string;
        controlled: "True" | "False";
        medication: string;
        dosage: string;
        frequency: string;
        duration: string;
        notes?: string;
    }[];
    lines: number[];
};

export type Output = {
    valid_records: number;
    processed_records: number;
    errors: {
        message: string;
        field: string;
        line: number;
        value: string;
    }[];
};

export class SaveBatchPrescriptionsUseCase implements UseCase<Input, Output> {
    constructor(private readonly prescriptionRepository: PrescriptionRepository<PrescriptionEntity>) {}

    async execute(input: Input): Promise<Output> {
        const response: Output = {
            valid_records: 0,
            processed_records: 0,
            errors: [],
        };

        const validPrescriptions: PrescriptionEntity[] = [];

        for (let i = 0; i < input.prescriptions.length; i++) {
            const notificationHandler = NotificationHandler.createEmpty();
            const prescriptionEntity = PrescriptionEntity.create(input.prescriptions[i]);
            prescriptionEntity.validate(notificationHandler);
            if (notificationHandler.hasErrors()) {
                const errors = (notificationHandler.getErrors() as PrescriptionDomainError[]).map(error => ({
                    message: error.message,
                    field: error.property,
                    line: input.lines[i],
                    value: error.value,
                }));
                response.errors.push(...errors);
            } else {
                response.valid_records++;
                validPrescriptions.push(prescriptionEntity);
            }
            response.processed_records++;
        }

        await this.prescriptionRepository.saveMany(validPrescriptions);

        return response;
    }
}