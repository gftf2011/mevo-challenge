import { PrescriptionEntity } from "../entities/PrescriptionEntity.js";

export interface PrescriptionRepository<T extends PrescriptionEntity> {
    saveMany(prescriptions: T[]): Promise<void>;
}