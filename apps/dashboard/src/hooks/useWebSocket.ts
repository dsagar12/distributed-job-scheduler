import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, subscribeToProject } from '../services/socket';

export type WsConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * Connects to the WebSocket server, subscribes to the active project,
 * and automatically invalidates React Query caches when job/worker events arrive.
 *
 * This hook is intentionally READ-ONLY from a job-state perspective:
 * it never mutates job state — it only triggers cache refreshes so the UI
 * reflects the authoritative PostgreSQL state.
 */
export function useWebSocket(projectId: string | null | undefined): WsConnectionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WsConnectionState>('connecting');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const socket = getSocket();

    const setStateSafe = (s: WsConnectionState) => {
      if (mountedRef.current) setState(s);
    };

    // Connection lifecycle
    const onConnect = () => setStateSafe('connected');
    const onDisconnect = () => setStateSafe('disconnected');
    const onConnectError = () => setStateSafe('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    if (socket.connected) {
      setStateSafe('connected');
    }

    // Subscribe to project-scoped events
    if (projectId) {
      subscribeToProject(projectId);
    }

    // Job state change events → invalidate relevant caches
    const onJobUpdated = (data: { jobId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recent-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
      if (data?.jobId) {
        queryClient.invalidateQueries({ queryKey: ['job', data.jobId] });
      }
    };

    const onJobCompleted = (data: { jobId?: string }) => {
      onJobUpdated(data);
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
    };

    const onJobFailed = (data: { jobId?: string }) => {
      onJobUpdated(data);
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
    };

    const onWorkerHeartbeat = () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    };

    const onQueueUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    };

    socket.on('job:updated', onJobUpdated);
    socket.on('job:completed', onJobCompleted);
    socket.on('job:failed', onJobFailed);
    socket.on('job:claimed', onJobUpdated);
    socket.on('job:queued', onJobUpdated);
    socket.on('worker:heartbeat', onWorkerHeartbeat);
    socket.on('queue:updated', onQueueUpdated);

    return () => {
      mountedRef.current = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('job:updated', onJobUpdated);
      socket.off('job:completed', onJobCompleted);
      socket.off('job:failed', onJobFailed);
      socket.off('job:claimed', onJobUpdated);
      socket.off('job:queued', onJobUpdated);
      socket.off('worker:heartbeat', onWorkerHeartbeat);
      socket.off('queue:updated', onQueueUpdated);
    };
  }, [projectId, queryClient]);

  return state;
}
