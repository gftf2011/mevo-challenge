import { Entity } from "../../../common/entities/Entity";
import { ValidationHandler } from "../../../common/validation/ValidationHandler";

export type Props = {
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

export class UploadStatusEntity extends Entity {
    private _upload_id: string;
    private _status: 'pending' | 'processing' | 'completed' | 'failed';
    private _total_records: number;
    private _processed_records: number;
    private _valid_records: number;
    private _errors: {
        message: string;
        field: string;
        line: number;
        value: string;
    }[];

    private constructor(props: Props) {
        super(props.id);
        this._upload_id = props.upload_id;
        this._status = props.status;
        this._total_records = props.total_records;
        this._processed_records = props.processed_records;
        this._valid_records = props.valid_records;
        this._errors = props.errors;
    }

    public static create(props: Props): UploadStatusEntity {
        return new UploadStatusEntity(props);
    }

    public updateStatus(status: 'pending' | 'processing' | 'completed' | 'failed'): UploadStatusEntity {
        this._status = status;
        return this;
    }

    public updateTotalRecords(total_records: number): UploadStatusEntity {
        this._total_records = total_records;
        return this;
    }

    public updateProcessedRecords(processed_records: number): UploadStatusEntity {
        this._processed_records = processed_records;
        return this;
    }

    public updateValidRecords(valid_records: number): UploadStatusEntity {
        this._valid_records = valid_records;
        return this;
    }

    public addErrors(errors: {
        message: string;
        field: string;
        line: number;
        value: string;
    }[]): UploadStatusEntity {
        this._errors.push(...errors);
        return this;
    }

    public get upload_id(): string {
        return this._upload_id;
    }

    public get status(): 'pending' | 'processing' | 'completed' | 'failed' {
        return this._status;
    }

    public get total_records(): number {
        return this._total_records;
    }

    public get processed_records(): number {
        return this._processed_records;
    }

    public get valid_records(): number {
        return this._valid_records;
    }

    public get errors(): {
        message: string;
        field: string;
        line: number;
        value: string;
    }[] {
        return this._errors;
    }

    public validate(_: ValidationHandler): void {
        return;
    }

    public toJSON() {
        return {
            id: this.id,
            upload_id: this._upload_id,
            status: this._status,
            total_records: this._total_records,
            processed_records: this._processed_records,
            valid_records: this._valid_records,
            errors: this._errors,
        };
    }
}