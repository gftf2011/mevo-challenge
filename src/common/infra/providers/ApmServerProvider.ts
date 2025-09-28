import apm from 'elastic-apm-node';

export class ApmServerProvider {
    private static instance: ApmServerProvider;

    private constructor() {}

    public static getInstance(): ApmServerProvider {
        if (!ApmServerProvider.instance) {
            ApmServerProvider.instance = new ApmServerProvider();
        }
        return ApmServerProvider.instance;
    }

    public start(): void {
        apm.start({
            serviceName: 'mevo-challenge',
            serviceVersion: '1.0.0',
            environment: 'development',
            serverUrl: 'http://localhost:8200',
            logLevel: 'info',
        });
    }
}