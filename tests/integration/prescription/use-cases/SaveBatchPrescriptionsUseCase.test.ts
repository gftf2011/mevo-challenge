import { Client } from "@elastic/elasticsearch";
import { GenericContainer, StartedTestContainer } from "testcontainers";
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

    afterEach(async () => {
        try { await client.indices.delete({ index: "prescriptions" }); } catch (error) {}
    });

    afterAll(async () => {
        await container.stop();
    });
});