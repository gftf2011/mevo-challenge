import { ValidationHandler } from "../validation/ValidationHandler.js";

export class NotificationHandler implements ValidationHandler {
    private constructor(private readonly errors: Error[]) {}

    static createWithErrors(errors: Error[]): NotificationHandler {
        return new NotificationHandler(errors);
    }

    static createWithError(error: Error): NotificationHandler {
        return new NotificationHandler([error]);
    }

    static createEmpty(): NotificationHandler {
        return new NotificationHandler([]);
    }

    public appendError(error: Error): ValidationHandler {
        this.errors.push(error);
        return this;
    }

    public appendHandler(handler: NotificationHandler): NotificationHandler {
        this.errors.push(...handler.errors);
        return this;
    }

    public getErrors(): Error[] {
        return this.errors;
    }

    public hasErrors(): boolean {
        return this.errors.length > 0;
    }
}