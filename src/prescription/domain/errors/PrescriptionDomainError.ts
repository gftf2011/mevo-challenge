import { DomainError } from "../../../common/errors/DomainError.js";

export class PrescriptionDomainError extends DomainError {
    public readonly value: string;
    public readonly property: string;
    
    constructor(message: string, value: string, property: string) {
        super(message);
        this.value = value;
        this.property = property;
    }
}