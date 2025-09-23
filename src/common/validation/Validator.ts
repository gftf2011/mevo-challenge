import { Entity } from "../entities/Entity.js";
import { ValidationHandler } from "./ValidationHandler.js";

export abstract class Validator {
    constructor(protected readonly entity: Entity, protected readonly handler: ValidationHandler) {}

    abstract validate(): void | Promise<void>;
}