import { ValidationHandler } from "../validation/ValidationHandler.js";

export abstract class Entity {
    constructor(private readonly _id: string) {}

    public get id(): string {
        return this._id;
    }

    public abstract validate(validationHandler: ValidationHandler): void | Promise<void>;
}