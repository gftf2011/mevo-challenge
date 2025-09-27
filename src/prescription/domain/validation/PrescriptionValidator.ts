import { ValidationHandler } from "../../../common/domain/validation/ValidationHandler";
import { Validator } from "../../../common/domain/validation/Validator";
import { PrescriptionEntity } from "../entities/PrescriptionEntity";
import { PrescriptionDomainError } from "../errors/PrescriptionDomainError";

export class PrescriptionValidator extends Validator {

    constructor(protected override readonly entity: PrescriptionEntity, protected override readonly handler: ValidationHandler) {
        super(entity, handler);
    }

    private checkValidCPF(): void {
        const checkForbiddenDocuments = (document: string): boolean => {
            const forbiddenDocuments = ["00000000000", "11111111111", "22222222222", "33333333333", "44444444444", "55555555555", "66666666666", "77777777777", "88888888888", "99999999999"];
            return forbiddenDocuments.includes(document);
        }

        const checkFirstDigit = (document: string): boolean => {
            const DOCUMENT_ONLY_NUMBERS_REGEX = /^(\d{3})(\d{3})(\d{3})(\d{2})$/g;

            const groups = DOCUMENT_ONLY_NUMBERS_REGEX.exec(document);

            if (!groups) {
                return false;
            }

            const value1 = groups[1];
            const value2 = groups[2];
            const value3 = groups[3];
            const validationDigits = groups[4];

            const num1: number = 10 * +String(value1).charAt(0);
            const num2: number = 9 * +String(value1).charAt(1);
            const num3: number = 8 * +String(value1).charAt(2);

            const num4: number = 7 * +String(value2).charAt(0);
            const num5: number = 6 * +String(value2).charAt(1);
            const num6: number = 5 * +String(value2).charAt(2);

            const num7: number = 4 * +String(value3).charAt(0);
            const num8: number = 3 * +String(value3).charAt(1);
            const num9: number = 2 * +String(value3).charAt(2);

            const result =
            ((num1 + num2 + num3 + num4 + num5 + num6 + num7 + num8 + num9) * 10) %
            11;

            let resultString = String(result);
            resultString = resultString.charAt(resultString.length - 1);

            return +String(validationDigits).charAt(0) === +resultString;
        };

        const checkSecondDigit = (document: string): boolean => {
            const DOCUMENT_ONLY_NUMBERS_REGEX = /^(\d{3})(\d{3})(\d{3})(\d{2})$/g;

            const groups = DOCUMENT_ONLY_NUMBERS_REGEX.exec(document);

            if (!groups) {
                return false;
            }

            const value1 = groups[1];
            const value2 = groups[2];
            const value3 = groups[3];
            const validationDigits = groups[4];

            const num1: number = 11 * +String(value1).charAt(0);
            const num2: number = 10 * +String(value1).charAt(1);
            const num3: number = 9 * +String(value1).charAt(2);

            const num4: number = 8 * +String(value2).charAt(0);
            const num5: number = 7 * +String(value2).charAt(1);
            const num6: number = 6 * +String(value2).charAt(2);

            const num7: number = 5 * +String(value3).charAt(0);
            const num8: number = 4 * +String(value3).charAt(1);
            const num9: number = 3 * +String(value3).charAt(2);

            const num10: number = 2 * +String(validationDigits).charAt(0);

            const result =
            ((num1 + num2 + num3 + num4 + num5 + num6 + num7 + num8 + num9 + num10) *
                10) %
            11;

            let resultString = String(result);
            resultString = resultString.charAt(resultString.length - 1);

            return +String(validationDigits).charAt(1) === +resultString;
        }

        const checkLength = (document: string): boolean => {
            return document.length === 11;
        }

        if (!this.entity.patient_cpf) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.patient_cpf" can not be empty`, this.entity.patient_cpf, "patient_cpf"));
        } else if (
            checkForbiddenDocuments(this.entity.patient_cpf) ||
            !checkLength(this.entity.patient_cpf) ||
            !checkFirstDigit(this.entity.patient_cpf) ||
            !checkSecondDigit(this.entity.patient_cpf)
        ) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.patient_cpf" can not be invalid such as - '${this.entity.patient_cpf}'`, this.entity.patient_cpf, "patient_cpf"));
        }
    }

    private checkValidUF(): void {
        const ufList = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
        if (!ufList.includes(this.entity.doctor_uf)) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.doctor_uf" can not be invalid such as - '${this.entity.doctor_uf}'`, this.entity.doctor_uf, "doctor_uf"));
        }
    }

    private checkFutureDate(): void {
        if (this.entity.date.getTime() > Date.now()) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.date" can not be in the future such as - '${this.entity.date.toISOString()}'`, this.entity.date.toISOString(), "date"));
        }
    }

    private checkDuration(): void {
        if (isNaN(this.entity.duration)) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.duration" can not be invalid such as - '${this.entity.duration}'`, this.entity.duration.toString(), "duration"));
        }

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

    private checkValidCRM(): void {
        if (!this.entity.doctor_crm) {
            this.handler.appendError(new PrescriptionDomainError(`"prescription.doctor_crm" can not be empty`, this.entity.doctor_crm, "doctor_crm"));
        } else {
            const regex = /^\d+$/;

            if (!regex.test(this.entity.doctor_crm)) {
                this.handler.appendError(new PrescriptionDomainError(`"prescription.doctor_crm" can not be invalid such as - '${this.entity.doctor_crm}'`, this.entity.doctor_crm, "doctor_crm"));
            }

            if (this.entity.doctor_crm.length !== 6) {
                this.handler.appendError(new PrescriptionDomainError(`"prescription.doctor_crm" can not be invalid length such as - '${this.entity.doctor_crm}'`, this.entity.doctor_crm, "doctor_crm"));
            }
        }
    }

    public override validate(): void {
        this.checkValidCPF();
        this.checkValidCRM();
        this.checkValidUF();
        this.checkFutureDate();
        this.checkDuration();
        this.checkNotes();
    }
}