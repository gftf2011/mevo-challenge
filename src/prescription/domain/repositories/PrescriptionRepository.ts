import { PrescriptionEntity } from "../entities/PrescriptionEntity";

export interface PrescriptionRepository<T extends PrescriptionEntity> {
    saveMany(prescriptions: T[]): Promise<void>;
}