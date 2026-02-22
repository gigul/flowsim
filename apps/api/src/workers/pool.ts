import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ProcessModel, SimConfig, SimResult } from '@flowsim/sim-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WorkerJob {
  resolve: (result: SimResult) => void;
  reject: (error: Error) => void;
  model: ProcessModel;
  config: SimConfig;
  onProgress?: (value: number) => void;
}

interface ActiveWorker {
  worker: Worker;
  busy: boolean;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Pool of Node.js worker threads for running simulations concurrently.
 * Manages a queue of pending jobs, spawns workers up to maxWorkers,
 * and enforces a per-job timeout.
 */
export class WorkerPool {
  private readonly maxWorkers: number;
  private readonly timeoutMs: number;
  private readonly workerPath: string;
  private workers: ActiveWorker[] = [];
  private queue: WorkerJob[] = [];
  private closed = false;

  constructor(maxWorkers = 4, timeoutMs = 60_000) {
    this.maxWorkers = maxWorkers;
    this.timeoutMs = timeoutMs;
    // Resolve the worker script path relative to this file
    this.workerPath = path.join(__dirname, 'sim-worker.ts');
  }

  /**
   * Submit a simulation job to the pool.
   * Returns a promise that resolves with the simulation result.
   */
  execute(
    model: ProcessModel,
    config: SimConfig,
    onProgress?: (value: number) => void,
  ): Promise<SimResult> {
    if (this.closed) {
      return Promise.reject(new Error('WorkerPool is closed'));
    }

    return new Promise<SimResult>((resolve, reject) => {
      const job: WorkerJob = { resolve, reject, model, config, onProgress };
      this.queue.push(job);
      this.processQueue();
    });
  }

  /**
   * Terminate all workers and reject pending jobs.
   */
  async close(): Promise<void> {
    this.closed = true;

    // Reject all queued jobs
    for (const job of this.queue) {
      job.reject(new Error('WorkerPool shutting down'));
    }
    this.queue = [];

    // Terminate all workers
    const terminations = this.workers.map(async (aw) => {
      if (aw.timeoutHandle) clearTimeout(aw.timeoutHandle);
      await aw.worker.terminate();
    });
    await Promise.allSettled(terminations);
    this.workers = [];
  }

  get pendingJobs(): number {
    return this.queue.length;
  }

  get activeWorkers(): number {
    return this.workers.filter((w) => w.busy).length;
  }

  // ── Internal ─────────────────────────────────────────────────────

  private processQueue(): void {
    if (this.queue.length === 0) return;

    // Find an idle worker
    let aw = this.workers.find((w) => !w.busy);

    // Or create a new one if under limit
    if (!aw && this.workers.length < this.maxWorkers) {
      aw = this.spawnWorker();
      this.workers.push(aw);
    }

    if (!aw) return; // All workers busy, job stays in queue

    const job = this.queue.shift()!;
    this.runJob(aw, job);
  }

  private spawnWorker(): ActiveWorker {
    const worker = new Worker(this.workerPath, {
      // Use tsx loader for TypeScript support during development
      execArgv: ['--import', 'tsx'],
    });

    return { worker, busy: false };
  }

  private runJob(aw: ActiveWorker, job: WorkerJob): void {
    aw.busy = true;

    // Set timeout
    aw.timeoutHandle = setTimeout(() => {
      aw.worker.terminate().then(() => {
        job.reject(new Error(`Simulation timed out after ${this.timeoutMs}ms`));
        // Remove the terminated worker
        this.workers = this.workers.filter((w) => w !== aw);
        this.processQueue();
      });
    }, this.timeoutMs);

    const onMessage = (msg: { type: string; data?: SimResult; value?: number; message?: string }) => {
      switch (msg.type) {
        case 'progress':
          if (job.onProgress && msg.value !== undefined) {
            job.onProgress(msg.value);
          }
          break;

        case 'result':
          cleanup();
          job.resolve(msg.data!);
          aw.busy = false;
          this.processQueue();
          break;

        case 'error':
          cleanup();
          job.reject(new Error(msg.message || 'Unknown worker error'));
          aw.busy = false;
          this.processQueue();
          break;
      }
    };

    const onError = (err: Error) => {
      cleanup();
      job.reject(err);
      aw.busy = false;
      // Remove broken worker
      this.workers = this.workers.filter((w) => w !== aw);
      this.processQueue();
    };

    const onExit = (code: number) => {
      if (aw.busy) {
        cleanup();
        job.reject(new Error(`Worker exited unexpectedly with code ${code}`));
        aw.busy = false;
        this.workers = this.workers.filter((w) => w !== aw);
        this.processQueue();
      }
    };

    const cleanup = () => {
      if (aw.timeoutHandle) {
        clearTimeout(aw.timeoutHandle);
        aw.timeoutHandle = undefined;
      }
      aw.worker.removeListener('message', onMessage);
      aw.worker.removeListener('error', onError);
      aw.worker.removeListener('exit', onExit);
    };

    aw.worker.on('message', onMessage);
    aw.worker.on('error', onError);
    aw.worker.on('exit', onExit);

    // Send the job
    aw.worker.postMessage({ model: job.model, config: job.config });
  }
}
