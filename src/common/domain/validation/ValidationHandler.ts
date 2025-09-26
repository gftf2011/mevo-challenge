export interface ValidationHandler {
    appendError(error: Error): ValidationHandler
    appendHandler(handler: ValidationHandler): ValidationHandler
    getErrors(): Error[]
    hasErrors(): boolean
}
