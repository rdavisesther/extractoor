/**
 * Vercel serverless entrypoint for the MailCMH API.
 *
 * Exports the Express app as the handler so Vercel's Node.js runtime
 * can invoke it directly (GET/POST/OPTIONS etc. are all handled).
 */
import { createApp } from '../src/app';

const app = createApp();

export default app;
