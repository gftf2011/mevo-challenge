import { cpf } from 'cpf-cnpj-validator';

import { NotificationHandler } from "../../../../../src/common/notifications/NotificationHandler";
import { PrescriptionEntity } from "../../../../../src/prescription/domain/entities/PrescriptionEntity";
import { PrescriptionDomainError } from '../../../../../src/prescription/domain/errors/PrescriptionDomainError';

describe('PrescriptionEntity - Test Suite', () => {
    it('given valid props, when calls validate(), then should have no errors', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '12345',
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
            doctor_crm: '12345',
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
        expect(notificationHandler.getErrors()[0]).toEqual(new PrescriptionDomainError(`"prescription.patient_cpf" can not be invalid such as - '00000000000'`, '00000000000', 'patient_cpf'));
    });

    it('given invalid props with incorrect "doctor_uf", when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '12345',
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
        expect(notificationHandler.getErrors()[0]).toEqual(new PrescriptionDomainError(`"prescription.doctor_uf" can not be invalid such as - 'ZZ'`, 'ZZ', 'doctor_uf'));
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
            doctor_crm: '12345',
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
        expect(notificationHandler.getErrors()[0]).toEqual(new PrescriptionDomainError(`"prescription.date" can not be in the future such as - '${tomorrow.toISOString()}'`, tomorrow.toISOString(), 'date'));
    });
    
    it('given invalid props with "duration" less than 0, when calls validate(), then should have error', () => {
        const notificationHandler = NotificationHandler.createEmpty();
        const prescription = PrescriptionEntity.create({
            id: '1',
            date: '2021-01-01',
            patient_cpf: cpf.generate(false),
            doctor_crm: '12345',
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
        expect(notificationHandler.getErrors()[0]).toEqual(new PrescriptionDomainError(`"prescription.duration" can not be less than 0 such as - '-1'`, '-1', 'duration'));
    });

    it('given invalid props with "controlled" equals "True" and "duration" greater than 60, when calls validate(), then should have error', () => {
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
            duration: '61',
            notes: 'Notes 1'
        });
        prescription.validate(notificationHandler);
        expect(notificationHandler.hasErrors()).toBe(true);
        expect(notificationHandler.getErrors().length).toBe(1);
        expect(notificationHandler.getErrors()[0]).toEqual(new PrescriptionDomainError(`"prescription.duration" can not be greater than 60 when "prescriptions.controlled" is True`, '61', 'duration'));
    });
});