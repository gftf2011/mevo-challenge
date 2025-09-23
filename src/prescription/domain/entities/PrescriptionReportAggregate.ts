import { Aggregate } from "../../../common/entities/Aggregate.js";
import { ValidationHandler } from "../../../common/validation/ValidationHandler.js";
import { PrescriptionReportValidator } from "../validation/PrescriptionReportValidator.js";
import { PrescriptionEntity } from "./PrescriptionEntity.js";

export type Props = {
    id: string;
    line: number;
};

export class PrescriptionReportAggregate extends Aggregate {
    private _prescriptions: PrescriptionEntity[];
    private _line: number;

    private constructor(props: Props) {
        super(props.id);
        this._line = props.line;
        this._prescriptions = [];
    }

    public static create(props: Props): PrescriptionReportAggregate {
        return new PrescriptionReportAggregate(props);
    }

    public get line(): number {
        return this._line;
    }

    public get prescriptions(): PrescriptionEntity[] {
        return this._prescriptions;
    }

    public addPrescription(prescription: PrescriptionEntity): void {
        this._prescriptions.push(prescription);
    }

    public validate(validationHandler: ValidationHandler): void | Promise<void> {
        new PrescriptionReportValidator(this, validationHandler).validate();
    }
}