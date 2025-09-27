import { cpf } from 'cpf-cnpj-validator';

import { NotificationHandler } from "../../../../../src/common/domain/notifications/NotificationHandler";
import { PrescriptionEntity } from "../../../../../src/prescription/domain/entities/PrescriptionEntity";
import { PrescriptionDomainError } from '../../../../../src/prescription/domain/errors/PrescriptionDomainError';

describe('PrescriptionEntity - Test Suite', () => {
    it('given valid props, when calls validate(), then should have no errors', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '10'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(false);
    });

    it('given invalid props with incorrect "patient_cpf", when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: '00000000000',
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '10'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe(`"prescription.patient_cpf" can not be invalid such as - '00000000000'`);
        expect(error.value).toBe("00000000000");
        expect(error.property).toBe("patient_cpf");
    });

    it('given invalid props with incorrect "doctor_uf", when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'ZZ',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '10'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe(`"prescription.doctor_uf" can not be invalid such as - 'ZZ'`);
        expect(error.value).toBe("ZZ");
        expect(error.property).toBe("doctor_uf");
    });

    it('given invalid props with future "date", when calls validate(), then should have error', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);

        const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`;

        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date,
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '10'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe(`"prescription.date" can not be in the future such as - '${tomorrow.toISOString()}'`);
        expect(error.value).toBe(tomorrow.toISOString());
        expect(error.property).toBe("date");
    });
    
    it('given invalid props with "duration" less than 0, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '-1'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe("\"prescription.duration\" can not be less than 0 such as - '-1'");
        expect(error.value).toBe("-1");
        expect(error.property).toBe("duration");
    });

    it('given invalid props with "controlled" equals "True" and "duration" greater than 60, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'True',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '61',
            notes: 'Notes 1'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe("\"prescription.duration\" can not be greater than 60 when \"prescriptions.controlled\" is True");
        expect(error.value).toBe("61");
        expect(error.property).toBe("duration");
    });

    it('given invalid props with "controlled" equals "False" and "duration" greater than 90, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'False',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '91',
            notes: 'Notes 1'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe("\"prescription.duration\" can not be greater than 90 when \"prescriptions.controlled\" is False");
        expect(error.value).toBe("91");
        expect(error.property).toBe("duration");
    });

    it('given invalid props with "controlled" equals "True" and "notes" do not exists, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '123456',
            doctor_uf: 'SP',
            controlled: 'True',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '60',
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe("\"prescription.notes\" can not be empty when \"prescriptions.controlled\" is True");
        expect(error.value).toBe("undefined");
        expect(error.property).toBe("notes");
    });

    it('given invalid props with "doctor_crm" with 5 digits, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '12345',
            doctor_uf: 'SP',
            controlled: 'True',
            medication: 'Medication 1',
            dosage: '10mg',
            frequency: '10mg',
            duration: '60',
            notes: 'Notes 1'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);

        const error = notificationHandler.getErrors()[0] as PrescriptionDomainError;
        expect(error.message).toBe("\"prescription.doctor_crm\" can not be invalid length such as - '12345'");
        expect(error.value).toBe("12345");
        expect(error.property).toBe("doctor_crm");
    });
});