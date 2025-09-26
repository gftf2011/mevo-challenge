import { Client } from "@elastic/elasticsearch";
import { UploadStatusRepository } from "../../domain/repositories/UploadStatusRepository";
import { UploadStatusEntity } from "../../domain/entities/UploadStatusEntity";

export class ElasticsearchUploadStatusRepository implements UploadStatusRepository<UploadStatusEntity> {
    private readonly indexName = 'upload-status';

    constructor(private readonly client: Client) {}

    private async createIndex(): Promise<void> {
        try {
            const indexExists = await this.client.indices.exists({ index: this.indexName });
            if (!indexExists) {
                await this.client.indices.create({
                    index: this.indexName,
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
        } catch (error) {
            console.log(`Error creating index: ${this.indexName}`);
            throw error;
        }
    }

    public async create(entity: UploadStatusEntity): Promise<void> {
        await this.createIndex();
        await this.client.index({
            index: this.indexName,
            id: entity.upload_id,
            document: entity.toJSON()
        });
    }

    public async update(entity: UploadStatusEntity): Promise<void> {
        await this.createIndex();
        await this.client.update({
            index: this.indexName,
            id: entity.upload_id,
            retry_on_conflict: 5,
            body: {
                script: {
                    lang: 'painless',
                    source: `
                        ctx._source.status = params.status;
                        ctx._source.total_records = params.total_records;
                        ctx._source.processed_records = params.processed_records;
                        ctx._source.valid_records = params.valid_records;
    
                        for (e in params.errors) { ctx._source.errors.add(e) }
                    `,
                    params: {
                        status: entity.status,
                        total_records: entity.total_records,
                        processed_records: entity.processed_records,
                        valid_records: entity.valid_records,
                        errors: entity.errors
                    },
                },
            } as any
        });
    }

    public async findByUploadId(uploadId: string, withErrors: boolean): Promise<UploadStatusEntity | null> {
        try {
            await this.createIndex();
            const response = await this.client.get({
                index: this.indexName,
                id: uploadId
            });

            const source = response._source as {
                id: string;
                upload_id: string;
                status: 'pending' | 'processing' | 'completed' | 'failed';
                total_records: number;
                processed_records: number;
                valid_records: number;
                errors: {
                    message: string;
                    field: string;
                    line: number;
                    value: string;
                }[];
            };

            if (response.found) {
                return UploadStatusEntity.create({
                    id: source.id,
                    upload_id: source.upload_id,
                    status: source.status,
                    total_records: source.total_records,
                    processed_records: source.processed_records,
                    valid_records: source.valid_records,
                    errors: withErrors ? source.errors : []
                });
            }

            return null;
        } catch (_error) {
            return null;
        }
    }    
}