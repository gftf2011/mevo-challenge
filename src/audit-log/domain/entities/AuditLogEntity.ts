import { Entity } from "../../../common/domain/entities/Entity";
import { ValidationHandler } from "../../../common/domain/validation/ValidationHandler";

export type Props = {
    id: string;
    type: "HTTP" | "JOB";
    resource: string;
    status: "SUCCESS" | "PROCESSING" | "ERROR" | "CLOSED";
    ip: string;
};

export class AuditLogEntity extends Entity {
    private _type: "HTTP" | "JOB";
    private _resource: string;
    private _status: "SUCCESS" | "PROCESSING" | "ERROR" | "CLOSED";
    private _ip: string;
    private _timestamp: Date;

    private constructor(props: Props) {
        super(props.id);
        this._type = props.type;
        this._resource = props.resource;
        this._status = props.status;
        this._ip = props.ip;
        this._timestamp = new Date();
    }

    public static create(props: Props): AuditLogEntity {
        return new AuditLogEntity(props);
    }

    public get type(): "HTTP" | "JOB" {
        return this._type;
    }

    public get resource(): string {
        return this._resource;
    }
    
    public get status(): "SUCCESS" | "PROCESSING" | "ERROR" | "CLOSED" {
        return this._status;
    }

    public get ip(): string {
        return this._ip;
    }
    
    public get timestamp(): Date {
        return this._timestamp;
    }

    public validate(_: ValidationHandler): void {}
    
    public toJSON() {
        return {
            id: this.id,
            type: this._type,
            resource: this._resource,
            status: this._status,
            ip: this._ip,
            timestamp: this._timestamp.toISOString(),
        };
    }
}