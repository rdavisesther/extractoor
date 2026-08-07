/**
 * Vercel serverless entrypoint.
 *
 * Lets the Express API run on Vercel as a Node.js function (Root Directory:
 * `backend`). History degrades to the in-memory store because Lambda filesystems
 * are ephemeral; for persistent history, deploy the standalone backend instead
 * (see docs/DEPLOYMENT.md).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';

const { app } = createApp({ databasePath: ':memory:' });

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as never, res as never);
}
