'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncProgressLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface SyncProgressState {
  phase: 'idle' | 'fetching' | 'processing' | 'completing' | 'complete' | 'error';
  fetchedCount: number;
  processedCount: number;
  totalCount: number;
  currentPage: number;
  currentProduct?: { name: string; sku?: string };
  logs: SyncProgressLog[];
  percentage: number;
  error?: string;
  summary?: {
    totalFetched: number;
    newCount: number;
    vendorsCreated?: number;
  };
}

const initialState: SyncProgressState = {
  phase: 'idle',
  fetchedCount: 0,
  processedCount: 0,
  totalCount: 0,
  currentPage: 0,
  logs: [],
  percentage: 0,
};

function computePercentage(phase: string, processedCount: number, totalCount: number): number {
  if (phase === 'complete') return 100;
  if (phase === 'error') return 0;
  if (phase === 'fetching') return 0; // Unknown total during fetch
  if (phase === 'completing') return 95;
  if (totalCount === 0) return 0;
  return Math.min(Math.round((processedCount / totalCount) * 90), 90); // 0-90% for processing
}

export function useSyncProgress(syncLogId: string | null) {
  const [state, setState] = useState<SyncProgressState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!syncLogId) {
      setState(initialState);
      return;
    }

    disconnect();

    const es = new EventSource(`/api/sync/${syncLogId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        setState({
          phase: data.phase,
          fetchedCount: data.fetchedCount ?? 0,
          processedCount: data.processedCount ?? 0,
          totalCount: data.totalCount ?? 0,
          currentPage: data.currentPage ?? 0,
          currentProduct: data.currentProduct,
          logs: data.logs ?? [],
          percentage: computePercentage(data.phase, data.processedCount ?? 0, data.totalCount ?? 0),
          error: data.error,
          summary: data.summary,
        });
      } catch { /* ignore malformed SSE data */ }
    });

    es.addEventListener('complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          phase: 'complete',
          percentage: 100,
          logs: data.logs ?? prev.logs,
          summary: data.summary,
        }));
      } catch { /* ignore */ }
      es.close();
    });

    es.addEventListener('error', (event) => {
      if (event instanceof MessageEvent && event.data) {
        try {
          const data = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            phase: 'error',
            percentage: 0,
            error: data.error ?? 'Unknown error',
            logs: data.logs ?? prev.logs,
          }));
        } catch { /* ignore */ }
      }
      es.close();
    });

    return () => {
      es.close();
    };
  }, [syncLogId, disconnect]);

  return state;
}
