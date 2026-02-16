import PgBoss from 'pg-boss';
import { env } from '../env';

export async function createWorkerQueue() {
  const boss = new PgBoss({
    connectionString: env.QUEUE_DATABASE_URL ?? env.DATABASE_URL,
    retryLimit: 6,
    retryBackoff: true,
    expireInHours: 2,
    monitorStateIntervalSeconds: 10
  });

  await boss.start();

  return boss;
}
