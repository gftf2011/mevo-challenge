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

    afterEach(() => {
        repository.deleteAll();
    });
});