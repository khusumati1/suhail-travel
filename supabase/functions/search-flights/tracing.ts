// supabase/functions/search-flights/tracing.ts
// ─────────────────────────────────────────────────────────
// Distributed Tracing — Span-based latency tracking
// trace_id per search, spans per provider/pricing/guard
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

export interface Span {
  name: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  status: 'ok' | 'error' | 'timeout';
  metadata?: Record<string, any>;
  children?: Span[];
}

export interface Trace {
  trace_id: string;
  request_id: string;
  route: string;
  startedAt: string;
  totalMs: number;
  spans: Span[];
  breakdown: {
    providers_ms: number;
    normalize_ms: number;
    trust_ms: number;
    pricing_ms: number;
    guard_ms: number;
    ranking_ms: number;
  };
}

export class TraceContext {
  readonly traceId: string;
  readonly requestId: string;
  readonly route: string;
  private readonly t0: number;
  private spans: Span[] = [];
  private activeSpans = new Map<string, { t0: number; meta?: Record<string, any> }>();

  constructor(requestId: string, route: string) {
    this.traceId = `tr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    this.requestId = requestId;
    this.route = route;
    this.t0 = Date.now();
  }

  /** Start a named span */
  startSpan(name: string, meta?: Record<string, any>): void {
    this.activeSpans.set(name, { t0: Date.now(), meta });
  }

  /** End a named span */
  endSpan(name: string, status: 'ok' | 'error' | 'timeout' = 'ok', extraMeta?: Record<string, any>): Span | null {
    const active = this.activeSpans.get(name);
    if (!active) return null;
    this.activeSpans.delete(name);

    const endMs = Date.now();
    const span: Span = {
      name,
      startMs: active.t0 - this.t0,
      endMs: endMs - this.t0,
      durationMs: endMs - active.t0,
      status,
      metadata: { ...active.meta, ...extraMeta },
    };
    this.spans.push(span);
    return span;
  }

  /** Convenience: run an async function as a span */
  async runSpan<T>(name: string, fn: () => Promise<T>, meta?: Record<string, any>): Promise<T> {
    this.startSpan(name, meta);
    try {
      const result = await fn();
      this.endSpan(name, 'ok');
      return result;
    } catch (err: any) {
      this.endSpan(name, 'error', { error: err.message });
      throw err;
    }
  }

  /** Build the final trace object */
  finalize(): Trace {
    // Close any unclosed spans
    for (const [name] of this.activeSpans) {
      this.endSpan(name, 'error', { reason: 'unclosed' });
    }

    const totalMs = Date.now() - this.t0;
    const getSpanMs = (prefix: string) => {
      const matching = this.spans.filter(s => s.name.startsWith(prefix));
      return matching.reduce((sum, s) => sum + s.durationMs, 0);
    };

    return {
      trace_id: this.traceId,
      request_id: this.requestId,
      route: this.route,
      startedAt: new Date(this.t0).toISOString(),
      totalMs,
      spans: this.spans.sort((a, b) => a.startMs - b.startMs),
      breakdown: {
        providers_ms: getSpanMs('provider:'),
        normalize_ms: getSpanMs('normalize'),
        trust_ms: getSpanMs('trust'),
        pricing_ms: getSpanMs('pricing'),
        guard_ms: getSpanMs('guard'),
        ranking_ms: getSpanMs('ranking'),
      },
    };
  }

  /** Log the trace as structured JSON */
  log(): void {
    const trace = this.finalize();
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'trace',
      trace_id: trace.trace_id,
      request_id: trace.request_id,
      route: trace.route,
      total_ms: trace.totalMs,
      breakdown: trace.breakdown,
      span_count: trace.spans.length,
      slow_spans: trace.spans.filter(s => s.durationMs > 3000).map(s => ({ name: s.name, ms: s.durationMs })),
    }));
  }
}
