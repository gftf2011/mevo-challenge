import { Client } from '@elastic/elasticsearch';

export class ElasticsearchConnection {
    private static instance: ElasticsearchConnection;
    private static client: Client;

    private constructor() {}

    public static getInstance(): ElasticsearchConnection {
        if (!ElasticsearchConnection.instance) {
            ElasticsearchConnection.instance = new ElasticsearchConnection();
        }
        return ElasticsearchConnection.instance;
    }

    private static async createIndex(client: Client): Promise<void> {
        let indexExists = await client.indices.exists({ index: 'prescriptions' });
        if (!indexExists) {
            await client.indices.create({
                index: 'prescriptions',
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

        indexExists = await client.indices.exists({ index: 'upload-status' });
        if (!indexExists) {
            await client.indices.create({
                index: 'upload-status',
                mappings: {
                    properties: {
                        upload_id: { type: "keyword" },
                        status: { type: "keyword" },
                        total_records: { type: "integer" },
                        processed_records: { type: "integer" },
                        valid_records: { type: "integer" },
                        errors: {
                            type: "nested",
                            properties: {
                                message: { type: "text" },
                                field: { type: "keyword" },
                                line: { type: "integer" },
                                value: { type: "keyword" }
                            }
                        }
                    }
                }
            });
        }
    }

    public static async connect(config?: { node: string }): Promise<void> {
        if (!ElasticsearchConnection.client) {
            const client = new Client({ node: config?.node || 'http://localhost:9200' });

            let isConnected = await client.ping();
            while (!isConnected) {
                try {
                    isConnected = await client.ping();
                } catch (error) {
                    console.log('Error connecting to Elasticsearch', error);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            await ElasticsearchConnection.createIndex(client);

            ElasticsearchConnection.client = client;
        }
    }

    public getClient(): Client {
        return ElasticsearchConnection.client;
    }

    public close(): void {
        ElasticsearchConnection.client.close();
    }
}