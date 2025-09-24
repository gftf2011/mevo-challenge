import { NotificationHandler } from "../../common/notifications/NotificationHandler";
import { UseCase } from "../../common/use-cases/UseCase";
import { PrescriptionEntity } from "../domain/entities/PrescriptionEntity";
import { PrescriptionRepository } from "../domain/repositories/PrescriptionRepository";
import { PrescriptionDomainError } from "../domain/errors/PrescriptionDomainError";

export type Input = {
    current_line: number;
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
        let line = input.current_line;

        const response: Output = {
            valid_records: 0,
            processed_records: 0,
            errors: [],
        };

        const validPrescriptions: PrescriptionEntity[] = [];

        for (const prescription of input.prescriptions) {
            const notificationHandler = NotificationHandler.createEmpty();
            const prescriptionEntity = PrescriptionEntity.create(prescription);
            prescriptionEntity.validate(notificationHandler);
            if (notificationHandler.hasErrors()) {
                const errors = (notificationHandler.getErrors() as PrescriptionDomainError[]).map(error => ({
                    message: error.message,
                    field: error.property,
                    line,
                    value: error.value,
                }));
                response.errors.push(...errors);
            } else {
                response.valid_records++;
                validPrescriptions.push(prescriptionEntity);
            }
            response.processed_records++;
            line++;
        }

        await this.prescriptionRepository.saveMany(validPrescriptions);

        return response;
    }
}