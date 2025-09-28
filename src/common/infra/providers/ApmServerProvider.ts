import apm from 'elastic-apm-node';

export class ApmServerProvider {
    public static start(config?: { serviceName: string }): apm.Agent {
        return apm.start({
            serviceName: config?.serviceName || 'mevo-challenge',
            serviceVersion: '1.0.0',
            environment: 'development',
            serverUrl: 'http://localhost:8200',
            logLevel: 'info',
        });
    }
}