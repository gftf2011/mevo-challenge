import { PrescriptionRepository } from "../../domain/repositories/PrescriptionRepository.js";
import { PrescriptionEntity } from "../../domain/entities/PrescriptionEntity.js";

export class InMemoryPrescriptionRepository implements PrescriptionRepository<PrescriptionEntity> {
    private static instance: InMemoryPrescriptionRepository;
    private prescriptions: PrescriptionEntity[] = [];

    private constructor() {}

    static create(): InMemoryPrescriptionRepository {
        if (!InMemoryPrescriptionRepository.instance) {
            InMemoryPrescriptionRepository.instance = new InMemoryPrescriptionRepository();
        }
        return InMemoryPrescriptionRepository.instance
    }

    async saveMany(prescriptions: PrescriptionEntity[]): Promise<void> {
        this.prescriptions.push(...prescriptions);
    }
}