import { Client } from "@elastic/elasticsearch";
import { PrescriptionEntity } from "../../domain/entities/PrescriptionEntity";
import { PrescriptionRepository } from "../../domain/repositories/PrescriptionRepository";

export class ElasticsearchPrescriptionRepository implements PrescriptionRepository<PrescriptionEntity> {
    private readonly indexName = 'prescriptions';

    constructor(private readonly client: Client) {}

    private async createIndex(): Promise<void> {
        try {
            const indexExists = await this.client.indices.exists({ index: this.indexName });
            if (!indexExists) {
                await this.client.indices.create({
                    index: this.indexName,
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            date: { type: 'date' },
                            patient_cpf: { type: 'keyword' },
                            doctor_crm: { type: 'keyword' },
                            doctor_uf: { type: 'keyword' },
                            medication: { type: 'keyword' },
                            controlled: { type: 'keyword' },
                            dosage: { type: 'text' },
                            frequency: { type: 'keyword' },
                            duration: { type: 'integer' },
                            notes: { type: 'text' }
                        }
                    }
                });
            }
        } catch (error) {
            console.log(`Error creating index: ${this.indexName}`);
            throw error;
        }
    }

    public async saveMany(prescriptions: PrescriptionEntity[]): Promise<void> {
        if (prescriptions.length === 0) return;
        try {
            await this.createIndex();
            const dataset = prescriptions.map(prescription => prescription.toJSON());
            const body = dataset.flatMap(doc => [{ index: { _index: this.indexName, _id: doc.id } }, doc])
            const response = await this.client.bulk({ refresh: true, body });
            if (response.errors) {
                console.error('Error bulk insert', response.errors);
                throw new Error('Error bulk insert');
            }
        } catch (error) {
            console.log(error);
        }
    }
}