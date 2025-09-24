import { ValidationHandler } from "../validation/ValidationHandler";

export abstract class Entity {
    protected constructor(private readonly _id: string) {}

    public get id(): string {
        return this._id;
    }

    public abstract validate(validationHandler: ValidationHandler): void | Promise<void>;

    public abstract toJSON(): any;
}