import { Client } from '@elastic/elasticsearch';

export class ElasticsearchConnection {
    private static instance: ElasticsearchConnection;
    private static client: Client;

    private constructor() {}

    public static getInstance(): ElasticsearchConnection {
        if (!ElasticsearchConnection.instance) {
            ElasticsearchConnection.instance = new ElasticsearchConnection();
        }
        return ElasticsearchConnection.instance;
    }

    public static async connect(config?: { node: string }): Promise<void> {
        if (!ElasticsearchConnection.client) {
            const client = new Client({ node: config?.node || 'http://localhost:9200' });

            let isConnected = await client.ping();
            while (!isConnected) isConnected = await client.ping();

            ElasticsearchConnection.client = client;
        }
    }

    public getClient(): Client {
        return ElasticsearchConnection.client;
    }

    public close(): void {
        ElasticsearchConnection.client.close();
    }
}