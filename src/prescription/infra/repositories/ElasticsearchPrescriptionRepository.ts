import { Client } from "@elastic/elasticsearch";
import { PrescriptionEntity } from "../../domain/entities/PrescriptionEntity";
import { PrescriptionRepository } from "../../domain/repositories/PrescriptionRepository";

export class ElasticsearchPrescriptionRepository implements PrescriptionRepository<PrescriptionEntity> {
    private readonly indexName = 'prescriptions';

    constructor(private readonly client: Client) {}

    public async saveMany(prescriptions: PrescriptionEntity[]): Promise<void> {
        if (prescriptions.length === 0) return;
        const dataset = prescriptions.map(prescription => prescription.toJSON());
        const body = dataset.flatMap(doc => [{ index: { _index: this.indexName, _id: doc.id } }, doc])
        await this.client.bulk({ refresh: true, body });
    }
}