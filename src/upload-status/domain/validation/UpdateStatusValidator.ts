import { DomainError } from "../../../common/errors/DomainError.js";
import { ValidationHandler } from "../../../common/validation/ValidationHandler.js";
import { Validator } from "../../../common/validation/Validator.js";
import { UploadStatusEntity } from "../entities/UploadStatusEntity.js";

export class UpdateStatusValidator extends Validator {
    constructor(protected override readonly entity: UploadStatusEntity, protected override readonly handler: ValidationHandler) {
        super(entity, handler);
    }

    private checkTotalRecords(): void {
        if (this.entity.total_records < 0) {
            this.handler.appendError(new DomainError("Total records must be greater than 0"));
        }
    }

    private checkProcessedRecords(): void {
        if (this.entity.processed_records < 0) {
            this.handler.appendError(new DomainError("Processed records must be greater than 0"));
        }
    }
    
    private checkValidRecords(): void {
        if (this.entity.valid_records < 0) {
            this.handler.appendError(new DomainError("Valid records must be greater than 0"));
        }
    }

    public validate(): void {
        this.checkTotalRecords();
        this.checkProcessedRecords();
        this.checkValidRecords();
    }
}