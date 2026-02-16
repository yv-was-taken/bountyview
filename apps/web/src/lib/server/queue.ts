import PgBoss from 'pg-boss';
import { QUEUE_NAMES, type QueueName } from '@bountyview/shared';
import { getEnv } from './env';

let boss: PgBoss | null = null;

export async function getQueue() {
  if (boss) {
    return boss;
  }

  const env = getEnv();
  boss = new PgBoss({
    connectionString: env.QUEUE_DATABASE_URL ?? env.DATABASE_URL,
    retryLimit: 5,
    retryBackoff: true,
    expireInHours: 2
  });

  await boss.start();

  await Promise.all(
    Object.values(QUEUE_NAMES).map((name) =>
      boss!.createQueue(name, {
        policy: 'standard'
      })
    )
  );

  return boss;
}

export async function enqueue(queueName: QueueName, payload: Record<string, unknown>) {
  const queue = await getQueue();
  return queue.send(queueName, payload);
}
