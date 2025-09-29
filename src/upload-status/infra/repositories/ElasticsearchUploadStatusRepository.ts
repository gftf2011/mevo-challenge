import { Client } from "@elastic/elasticsearch";
import { UploadStatusRepository } from "../../domain/repositories/UploadStatusRepository";
import { UploadStatusEntity } from "../../domain/entities/UploadStatusEntity";

export class ElasticsearchUploadStatusRepository implements UploadStatusRepository<UploadStatusEntity> {
    private readonly indexUploadStatusName = 'upload-status';
    private readonly indexErrorsName = 'upload-status-errors';

    constructor(private readonly client: Client) {}

    public async create(entity: UploadStatusEntity): Promise<void> {
        const { id, upload_id, status, total_records, processed_records, valid_records } = entity.toJSON();
        await this.client.index({
            index: this.indexUploadStatusName,
            id: entity.upload_id,
            document: {
                id,
                upload_id,
                status,
                total_records,
                processed_records,
                valid_records,
            }
        });
    }

    public async update(entity: UploadStatusEntity): Promise<void> {
        if (entity.errors.length > 0) {
            const errorsDataset = entity.errors.map(error => ({ ...error, upload_id: entity.upload_id, id: crypto.randomUUID() }));
            const errorsBody = errorsDataset.flatMap(doc => [{ index: { _index: this.indexErrorsName, _id: doc.id } }, doc])
            await this.client.bulk({ refresh: true, body: errorsBody });
        }
        
        await this.client.update({
            index: this.indexUploadStatusName,
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
                    `,
                    params: {
                        status: entity.status,
                        total_records: entity.total_records,
                        processed_records: entity.processed_records,
                        valid_records: entity.valid_records,
                    },
                },
            } as any
        });
    }

    public async findByUploadId(uploadId: string, withErrors: boolean): Promise<UploadStatusEntity | null> {
        try {
            const errors: any[] = [];
            if (withErrors) {
                let errorsScroll = await this.client.search({
                    index: this.indexErrorsName,
                    scroll: '1m', // keep context alive for 1 minute
                    size: 1000, // batch size
                    query: {
                      term: { upload_id: uploadId }
                    }
                });
    
                let scrollId = errorsScroll._scroll_id;
                let hits = errorsScroll.hits.hits;
    
                while (hits.length && hits.length > 0) {
                    errors.push(...hits);
                    const scroll = await this.client.scroll({
                        scroll_id: scrollId,
                        scroll: '1m',
                    });
    
                    scrollId = scroll._scroll_id;
                    hits = scroll.hits.hits;
                }
    
                await this.client.clearScroll({ scroll_id: scrollId });
            }

            const mappedErrors = errors.map(error => ({
                message: error._source.message,
                field: error._source.field,
                line: error._source.line,
                value: error._source.value,
            }));

            const response = await this.client.get({
                index: this.indexUploadStatusName,
                id: uploadId
            });

            const source = response._source as {
                id: string;
                upload_id: string;
                status: 'pending' | 'processing' | 'completed' | 'failed';
                total_records: number;
                processed_records: number;
                valid_records: number;
            };

            if (response.found) {
                return UploadStatusEntity.create({
                    id: source.id,
                    upload_id: source.upload_id,
                    status: source.status,
                    total_records: source.total_records,
                    processed_records: source.processed_records,
                    valid_records: source.valid_records,
                    errors: mappedErrors,
                });
            }

            return null;
        } catch (_error) {
            return null;
        }
    }    
}