import { ValidationHandler } from "../../../common/validation/ValidationHandler.js";
import { Validator } from "../../../common/validation/Validator.js";
import { PrescriptionReportAggregate } from "../entities/PrescriptionReportAggregate.js";

export class PrescriptionReportValidator extends Validator {
    constructor(protected readonly entity: PrescriptionReportAggregate, protected readonly handler: ValidationHandler) {
        super(entity, handler);
    }

    private checkPrescriptions(): void {
        this.entity.prescriptions.forEach(prescription => {
            prescription.validate(this.handler);
        });
    }

    public validate(): void {
        this.checkPrescriptions();
    }
}