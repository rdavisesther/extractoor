/**
 * Worker-thread entry point.
 * Receives a GenerateJob over the parent port, generates, and posts results
 * back. Keeping this file dependency-free makes it safe to run under tsx in
 * development and as compiled JS in production.
 */
import { parentPort } from 'node:worker_threads';
import { generateForJob, type GenerateJob } from '../services/generator.core';

parentPort?.on('message', (job: GenerateJob) => {
  const started = performance.now();
  const { results, duplicates } = generateForJob(job);
  parentPort?.postMessage({
    results,
    duplicates,
    ms: Math.round(performance.now() - started),
  });
});
