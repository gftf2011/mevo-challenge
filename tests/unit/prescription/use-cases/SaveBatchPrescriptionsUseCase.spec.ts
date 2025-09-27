import { cpf } from 'cpf-cnpj-validator';

import { SaveBatchPrescriptionsUseCase } from "../../../../src/prescription/use-cases/SaveBatchPrescriptionsUseCase";
import { InMemoryPrescriptionRepository } from "../../../../src/prescription/infra/repositories/InMemoryPrescriptionRepository";

describe("SaveBatchPrescriptionsUseCase - Test Suite", () => {
    let repository: InMemoryPrescriptionRepository;

    beforeAll(() => {
        repository = InMemoryPrescriptionRepository.create();
    });

    it("given input with valid empty prescriptions list, when calls execute(), then should return valid records", async () => {
        const sut = new SaveBatchPrescriptionsUseCase(repository);
        const result = await sut.execute({ prescriptions: [], current_line: 1 });
        expect(result).toBeDefined();
        expect(result.valid_records).toBe(0);
        expect(result.processed_records).toBe(0);
        expect(result.errors.length).toBe(0);
    });

    it("given input with valid prescriptions list, when calls execute(), then should return valid processed records", async () => {
        const sut = new SaveBatchPrescriptionsUseCase(repository);
        const result = await sut.execute({ prescriptions: [{
            id: "1",
            date: "2021-01-01",
            patient_cpf: cpf.generate(false),
            doctor_crm: "12345",
            doctor_uf: "SP",
            controlled: "True",
            medication: "Medication",
            dosage: "10mg",
            frequency: "10mg",
            duration: "10",
            notes: "Notes",
        }], current_line: 1 });
        expect(result).toBeDefined();
        expect(result.valid_records).toBe(1);
        expect(result.processed_records).toBe(1);
        expect(result.errors.length).toBe(0);
    });

    it("given input with invalid prescriptions list, when calls execute(), then should return records with errors", async () => {
        const sut = new SaveBatchPrescriptionsUseCase(repository);
        const result = await sut.execute({ prescriptions: [{
            id: "1",
            date: "2021-01-01",
            patient_cpf: "00000000000",
            doctor_crm: "12345",
            doctor_uf: "SP",
            controlled: "True",
            medication: "Medication",
            dosage: "10mg",
            frequency: "10mg",
            duration: "10g",
            notes: "Notes",
        }], current_line: 1 });
        expect(result).toBeDefined();
        expect(result.valid_records).toBe(0);
        expect(result.processed_records).toBe(1);
        expect(result.errors.length).toBe(2);
        expect(result.errors[0].message).toBe("\"prescription.patient_cpf\" can not be invalid such as - '00000000000'");
        expect(result.errors[0].field).toBe("patient_cpf");
        expect(result.errors[0].line).toBe(1);
        expect(result.errors[0].value).toBe("00000000000");
        expect(result.errors[1].message).toBe("\"prescription.duration\" can not be invalid such as - 'NaN'");
        expect(result.errors[1].field).toBe("duration");
        expect(result.errors[1].line).toBe(1);
        expect(result.errors[1].value).toBe("NaN");
    });

    afterEach(() => {
        repository.deleteAll();
    });
});