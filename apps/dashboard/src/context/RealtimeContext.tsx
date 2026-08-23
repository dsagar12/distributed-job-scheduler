import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, subscribeToProject } from '../services/socket';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: { type: string; payload: any; timestamp: Date } | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  lastEvent: null,
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; payload: any; timestamp: Date } | null>(null);
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      if (activeProject?.id) {
        subscribeToProject(activeProject.id);
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    const eventNames = [
      'job:created',
      'job:claimed',
      'job:completed',
      'job:failed',
      'job:dead_letter',
      'job:queued',
      'job:recovered',
      'worker:heartbeat',
      'schedule:triggered',
      'metrics:updated',
    ];

    const handleGenericEvent = (eventType: string) => (payload: any) => {
      setLastEvent({
        type: eventType,
        payload,
        timestamp: new Date(),
      });

      // Invalidate relevant queries
      if (eventType.startsWith('job:')) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
        queryClient.invalidateQueries({ queryKey: ['queues'] });
      }
      if (eventType.startsWith('worker:')) {
        queryClient.invalidateQueries({ queryKey: ['workers'] });
      }
      if (eventType.startsWith('schedule:')) {
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
      }
    };

    const listeners: Array<{ event: string; fn: (payload: any) => void }> = [];

    for (const name of eventNames) {
      const listener = handleGenericEvent(name);
      socket.on(name, listener);
      listeners.push({ event: name, fn: listener });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      for (const item of listeners) {
        socket.off(item.event, item.fn);
      }
    };
  }, [activeProject?.id, queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
