/**
 * Server entrypoint.
 */
import { config } from './config/env';
import { createApp } from './app';
import { logger } from './utils/logger';
import { getPool } from './workers/workerPool';

async function main(): Promise<void> {
  const { app, services } = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`Subdomain Generator API listening on http://localhost:${config.port}`, {
      env: config.nodeEnv,
      workers: getPool().count,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => {
      getPool()
        .shutdown()
        .finally(() => {
          services.store.close();
          process.exit(0);
        });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error during startup', { message: err instanceof Error ? err.message : err });
  process.exit(1);
});
