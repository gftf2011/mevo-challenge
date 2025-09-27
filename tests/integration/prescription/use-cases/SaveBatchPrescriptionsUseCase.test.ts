import { Client } from "@elastic/elasticsearch";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { cpf } from "cpf-cnpj-validator";

import { ElasticsearchConnection } from "../../../../src/common/infra/db/ElasticsearchConnection";
import { ElasticsearchPrescriptionRepository } from "../../../../src/prescription/infra/repositories/ElasticsearchPrescriptionRepository";
import { SaveBatchPrescriptionsUseCase } from "../../../../src/prescription/use-cases/SaveBatchPrescriptionsUseCase";

describe("SaveBatchPrescriptionsUseCase - Integration Test Suite", () => {
    let container: StartedTestContainer;
    let client: Client;

    beforeAll(async () => {
        container = await new GenericContainer("docker.elastic.co/elasticsearch/elasticsearch:9.1.4")
            .withEnvironment({
                "discovery.type": "single-node",
                "xpack.security.enabled": "false"
            })
            .withExposedPorts(9200)
            .start();

        await ElasticsearchConnection.connect({ node: `http://${container.getHost()}:${container.getMappedPort(9200)}` });
        client = ElasticsearchConnection.getInstance().getClient();
    });

    it('given input with valid empty prescriptions list, when calls execute(), then should return valid records', async () => {
        const repository = new ElasticsearchPrescriptionRepository(client);
        const sut = new SaveBatchPrescriptionsUseCase(repository);
        const result = await sut.execute({ prescriptions: [], current_line: 1 });
        expect(result).toBeDefined();
        expect(result.valid_records).toBe(0);
        expect(result.processed_records).toBe(0);
        expect(result.errors.length).toBe(0);
    });

    it('given input with valid prescriptions list, when calls execute(), then should return valid processed records', async () => {
        const repository = new ElasticsearchPrescriptionRepository(client);
        const sut = new SaveBatchPrescriptionsUseCase(repository);
        const result = await sut.execute({ prescriptions: [{
            id: "1",
            date: "2021-01-01",
            patient_cpf: cpf.generate(false),
            doctor_crm: "123456",
            doctor_uf: "SP",
            controlled: "True",
            medication: "Medication",
            dosage: "10mg",
            frequency: "10mg",
            duration: "10",
            notes: "Notes",
        },
        {
            id: "2",
            date: "2009-01-18",
            patient_cpf: cpf.generate(false),
            doctor_crm: "123450",
            doctor_uf: "RJ",
            controlled: "False",
            medication: "Medication",
            dosage: "10mg",
            frequency: "100mg",
            duration: "16",
        }], current_line: 1 });
        expect(result).toBeDefined();
        expect(result.valid_records).toBe(2);
        expect(result.processed_records).toBe(2);
        expect(result.errors.length).toBe(0);
    });

    afterEach(async () => {
        try { await client.indices.delete({ index: "prescriptions" }); } catch (error) {}
    });

    afterAll(async () => {
        await container.stop();
    });
});