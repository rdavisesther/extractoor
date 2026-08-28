import { config } from './config/env';
import { createApp } from './app';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`MailCMH API listening on http://localhost:${config.port}`, {
      env: config.nodeEnv,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error during startup', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
