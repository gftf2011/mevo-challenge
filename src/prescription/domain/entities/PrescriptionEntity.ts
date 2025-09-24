import { Entity } from "../../../common/entities/Entity";
import { ValidationHandler } from "../../../common/validation/ValidationHandler";
import { PrescriptionValidator } from "../validation/PrescriptionValidator";

export type Props = {
    id: string;
    date: string;
    patient_cpf: string;
    doctor_crm: string;
    doctor_uf: string;
    controlled: "True" | "False";
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
};

export class PrescriptionEntity extends Entity {
    private _date: Date;
    private _patient_cpf: string;
    private _doctor_crm: string;
    private _doctor_uf: string;
    private _controlled: "True" | "False";
    private _medication: string;
    private _dosage: string;
    private _frequency: string;
    private _duration: number;
    private _notes?: string;

    private constructor(props: Props) {
        super(props.id);
        this._date = new Date(props.date);
        this._patient_cpf = props.patient_cpf;
        this._doctor_crm = props.doctor_crm;
        this._doctor_uf = props.doctor_uf;
        this._controlled = props.controlled;
        this._medication = props.medication;
        this._dosage = props.dosage;
        this._frequency = props.frequency;
        this._duration = +props.duration;
        this._notes = props.notes;
    }

    public get date(): Date {
        return this._date;
    }

    public get patient_cpf(): string {
        return this._patient_cpf;
    }

    public get doctor_crm(): string {
        return this._doctor_crm;
    }

    public get doctor_uf(): string {
        return this._doctor_uf;
    }

    public get controlled(): "True" | "False" {
        return this._controlled;
    }

    public get medication(): string {
        return this._medication;
    }

    public get dosage(): string {
        return this._dosage;
    }

    public get frequency(): string {
        return this._frequency;
    }

    public get duration(): number {
        return this._duration;
    }

    public get notes(): string | undefined {
        return this._notes;
    }

    public static create(props: Props): PrescriptionEntity {
        return new PrescriptionEntity(props);
    }

    public validate(validationHandler: ValidationHandler): void {
        new PrescriptionValidator(this, validationHandler).validate();
    }

    public toJSON(): any {
        return {
            id: this.id,
            date: this.date.toISOString(),
            patient_cpf: this.patient_cpf,
            doctor_crm: this.doctor_crm,
            doctor_uf: this.doctor_uf,
            controlled: this.controlled,
            medication: this.medication,
            dosage: this.dosage,
            frequency: this.frequency,
            duration: this.duration,
            notes: this.notes,
        };
    }
}