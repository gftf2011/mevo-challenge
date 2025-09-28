import app from './app';
import { ElasticsearchConnection } from './common/infra/db/ElasticsearchConnection';

const port = Number(process.env.PORT || 3000);

app.listen(port, async () => {
    await ElasticsearchConnection.connect();
    console.log('Server is running on port 3000');
});