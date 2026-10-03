// Shared same-origin downloads. Bound concurrency and retained JSON bytes;
// component state holds only the assets needed by its current viewport.
type Job = {
  path: string;
  controller: AbortController;
  users: Set<symbol>;
  promise: Promise<unknown>;
  resolve: (data: unknown) => void;
  reject: (error: unknown) => void;
};
const pending = new Map<string, Job>();
const queue: Job[] = [];
const cache = new Map<string, { data: unknown; bytes: number }>();
const budget = 8_000_000;
let active = 0, retained = 0;

const pump = () => {
  while (active < 4 && queue.length) {
    const job = queue.shift()!;
    if (!job.users.size) continue;
    active++;
    fetch(job.path, { signal: job.controller.signal, cache: /\?v=|\.[a-f0-9]{12}\.json$/.test(job.path) ? "default" : "no-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("Map asset unavailable");
        const text = await response.text(), data: unknown = JSON.parse(text);
        if (job.controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const bytes = new TextEncoder().encode(text).byteLength;
        if (bytes <= budget) {
          while (retained + bytes > budget && cache.size) {
            const oldest = cache.keys().next().value!;
            retained -= cache.get(oldest)!.bytes;
            cache.delete(oldest);
          }
          cache.set(job.path, { data, bytes });
          retained += bytes;
        }
        job.resolve(data);
      }).catch(job.reject).finally(() => {
        if (pending.get(job.path) === job) pending.delete(job.path);
        active--;
        pump();
      });
  }
};

export function loadMapAsset<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  path = new URL(path, window.location.href).href;
  const cached = cache.get(path);
  if (cached) {
    cache.delete(path);
    cache.set(path, cached);
    return Promise.resolve(cached.data as T);
  }
  let job = pending.get(path);
  if (!job) {
    let resolve!: Job["resolve"], reject!: Job["reject"];
    const promise = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; });
    job = { path, controller: new AbortController(), users: new Set(), promise, resolve, reject };
    pending.set(path, job);
    queue.push(job);
  }
  const current = job, user = Symbol();
  current.users.add(user);
  const result = new Promise<T>((resolve, reject) => {
    const cleanup = () => { current.users.delete(user); signal?.removeEventListener("abort", cancel); };
    const cancel = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
      if (!current.users.size) {
        if (pending.get(path) === current) pending.delete(path);
        const queued = queue.indexOf(current);
        if (queued !== -1) queue.splice(queued, 1);
        current.controller.abort();
        current.reject(new DOMException("Aborted", "AbortError"));
      }
    };
    signal?.addEventListener("abort", cancel, { once: true });
    current.promise.then(data => { cleanup(); resolve(data as T); }, error => { cleanup(); reject(error); });
  });
  pump();
  return result;
}
