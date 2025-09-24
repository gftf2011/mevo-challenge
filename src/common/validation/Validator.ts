import { Entity } from "../entities/Entity";
import { ValidationHandler } from "./ValidationHandler";

export abstract class Validator {
    constructor(protected readonly entity: Entity, protected readonly handler: ValidationHandler) {}

    abstract validate(): void | Promise<void>;
}