import { ValidationHandler } from "../../../common/validation/ValidationHandler.js";
import { Validator } from "../../../common/validation/Validator.js";
import { PrescriptionEntity } from "../entities/PrescriptionEntity.js";
import { PrescriptionDomainError } from "../errors/PrescriptionDomainError.js";

export class PrescriptionValidator extends Validator {

    constructor(protected override readonly entity: PrescriptionEntity, protected override readonly handler: ValidationHandler) {
        super(entity, handler);
    }

    private checkFutureDate(): void {
        if (this.entity.date.getTime() > Date.now()) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.date" can not be in the future such as - '${this.entity.date.toISOString()}'`, this.entity.date.toISOString(), "date"));
        }
    }

    private checkDuration(): void {
        if (this.entity.duration < 0) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.duration" can not be less than 0 such as - '${this.entity.duration}'`, this.entity.duration.toString(), "duration"));
        }

        if (this.entity.controlled === "True") {
            if (this.entity.duration > 60) {
                this.handler.appendError(new PrescriptionDomainError(`"prescription.duration" can not be greater than 60 when "prescriptions.controlled" is ${this.entity.controlled}`, this.entity.duration.toString(), "duration"));
            }
        } else if (this.entity.controlled === "False") {
            if (this.entity.duration > 90) {
                this.handler.appendError(new PrescriptionDomainError(`"prescription.duration" can not be greater than 90 when "prescriptions.controlled" is ${this.entity.controlled}`, this.entity.duration.toString(), "duration"));
            }
        }
    }

    private checkNotes(): void {
        if (this.entity.controlled === "True") {
            if (!this.entity.notes) {
                this.handler.appendError(new PrescriptionDomainError(`"prescription.notes" can not be empty when "prescriptions.controlled" is ${this.entity.controlled}`, String(this.entity.notes), "notes"));
            }
        }
    }

    public override validate(): void {
        this.checkFutureDate();
        this.checkDuration();
        this.checkNotes();
    }
}