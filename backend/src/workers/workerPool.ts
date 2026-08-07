/**
 * Persistent worker-thread pool.
 *
 * Distributes a generation job across N worker threads by splitting the prefix
 * pool into contiguous chunks (preserving result order). Workers are created
 * lazily on first use and reused across requests; crashed workers are replaced.
 */
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateForJob, type GenerateJob } from '../services/generator.core';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/** Resolves the worker entry file for both dev (tsx) and prod (tsc) layouts. */
function resolveWorkerPath(): string {
  const candidates = [
    join(__dirname, 'generator.worker.js'),
    join(__dirname, 'generator.worker.ts'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error('Unable to locate generator.worker entry file.');
  }
  return found;
}

interface PooledWorker {
  worker: Worker;
  busy: boolean;
}

export class WorkerPool {
  private workers: PooledWorker[] = [];
  private readonly size: number;
  private readonly inlineThreshold = 5000;

  constructor() {
    // Serverless environments (Vercel) don't support worker threads reliably,
    // so the pool degrades to inline main-thread generation there.
    if (process.env.VERCEL === '1') {
      this.size = 1;
      return;
    }
    const requested = config.workerPoolSize;
    const cores = cpus().length;
    this.size = requested > 0 ? Math.min(requested, 16) : Math.max(1, Math.min(cores - 1 || 1, 8));
  }

  get count(): number {
    return this.size;
  }

  private ensureWorkers(): void {
    if (this.workers.length > 0) return;
    const workerPath = resolveWorkerPath();
    for (let i = 0; i < this.size; i++) {
      this.workers.push({ worker: new Worker(workerPath), busy: false });
    }
  }

  /**
   * Runs a generation job. Small jobs run inline on the main thread to avoid
   * worker-spawn overhead; large jobs are chunked across the pool.
   */
  async run(
    job: GenerateJob,
  ): Promise<{ results: string[]; duplicates: number }> {
    if (job.share <= this.inlineThreshold || this.size === 1) {
      return generateForJob(job);
    }
    return this.runParallel(job);
  }

  private async runParallel(
    job: GenerateJob,
  ): Promise<{ results: string[]; duplicates: number }> {
    this.ensureWorkers();
    const totalWorkers = this.workers.length;
    const chunkCount = Math.min(totalWorkers, job.prefixes.length);
    const perChunk = Math.ceil(job.prefixes.length / chunkCount);
    const jobs: { chunk: string[]; share: number }[] = [];

    for (let i = 0; i < job.prefixes.length; i += perChunk) {
      const chunk = job.prefixes.slice(i, i + perChunk);
      jobs.push({
        chunk,
        share: Math.floor((job.share * chunk.length) / job.prefixes.length),
      });
    }

    const results = await Promise.all(
      jobs.map((sub, index) =>
        this.dispatch({
          domains: job.domains,
          prefixes: sub.chunk,
          share: sub.share,
          format: job.format,
          index,
        }),
      ),
    );

    const merged: string[] = [];
    let duplicates = 0;
    for (const r of results) {
      merged.push(...r.results);
      duplicates += r.duplicates;
    }
    return { results: merged, duplicates };
  }

  private dispatch(
    job: GenerateJob & { index: number },
  ): Promise<{ results: string[]; duplicates: number }> {
    const slot = this.workers[job.index % this.workers.length];
    slot.busy = true;

    return new Promise<{ results: string[]; duplicates: number }>((resolve, reject) => {
      const onMessage = (message: { results: string[]; duplicates: number; ms: number }): void => {
        cleanup();
        slot.busy = false;
        resolve({ results: message.results, duplicates: message.duplicates ?? 0 });
      };
      const onError = (error: Error): void => {
        cleanup();
        slot.busy = false;
        reject(error);
        this.replaceWorker(slot);
      };
      const onExit = (): void => {
        cleanup();
        slot.busy = false;
        this.replaceWorker(slot);
      };
      const cleanup = (): void => {
        slot.worker.off('message', onMessage);
        slot.worker.off('error', onError);
        slot.worker.off('exit', onExit);
      };

      slot.worker.once('message', onMessage);
      slot.worker.once('error', onError);
      slot.worker.once('exit', onExit);
      slot.worker.postMessage({
        domains: job.domains,
        prefixes: job.prefixes,
        share: job.share,
        format: job.format,
      });
    });
  }

  private replaceWorker(slot: PooledWorker): void {
    const index = this.workers.indexOf(slot);
    if (index === -1) return;
    try {
      slot.worker.terminate();
    } catch {
      // already gone
    }
    const workerPath = resolveWorkerPath();
    this.workers[index] = { worker: new Worker(workerPath), busy: false };
    logger.warn('Worker replaced after unexpected exit.');
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      this.workers.map((w) => w.worker.terminate().catch(() => undefined)),
    );
    this.workers = [];
  }
}

let poolInstance: WorkerPool | null = null;

/** Singleton accessor. */
export function getPool(): WorkerPool {
  if (!poolInstance) poolInstance = new WorkerPool();
  return poolInstance;
}
