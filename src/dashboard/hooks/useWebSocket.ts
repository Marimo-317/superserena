/**
 * WebSocket Hook for SuperClaude Dashboard
 * Real-time communication with monitoring server
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WSEvents } from '../../types/monitoring';

interface WebSocketOptions {
  onSessionStart?: (data: WSEvents['session-start']) => void;
  onSessionUpdate?: (data: WSEvents['session-update']) => void;
  onSessionEnd?: (data: WSEvents['session-end']) => void;
  onAgentUpdate?: (data: WSEvents['agent-update']) => void;
  onSPARCUpdate?: (data: WSEvents['sparc-update']) => void;
  onQualityGate?: (data: WSEvents['quality-gate']) => void;
  onWaveUpdate?: (data: WSEvents['wave-update']) => void;
  onPerformanceUpdate?: (data: WSEvents['performance-update']) => void;
  onMemoryUpdate?: (data: WSEvents['memory-update']) => void;
  onError?: (data: WSEvents['error']) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const messageQueue = useRef<Array<{ event: string; data: any }>>([]);
  
  const {
    onSessionStart,
    onSessionUpdate, 
    onSessionEnd,
    onAgentUpdate,
    onSPARCUpdate,
    onQualityGate,
    onWaveUpdate,
    onPerformanceUpdate,
    onMemoryUpdate,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const connect = useCallback(() => {
    try {
      console.log(`Attempting to connect to WebSocket: ${url}`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionAttempts(0);
        setLastError(null);
        
        // Send queued messages
        if (messageQueue.current.length > 0) {
          messageQueue.current.forEach(({ event, data }) => {
            sendMessage(event, data);
          });
          messageQueue.current = [];
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && connectionAttempts < maxReconnectAttempts) {
          setConnectionAttempts(prev => prev + 1);
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setLastError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setLastError('Failed to create WebSocket connection');
    }
  }, [url, connectionAttempts, maxReconnectAttempts, reconnectInterval]);

  const handleMessage = useCallback((message: any) => {
    const { type, data } = message;

    switch (type) {
      case 'session-start':
        onSessionStart?.(data);
        break;
      case 'session-update':
        onSessionUpdate?.(data);
        break;
      case 'session-end':
        onSessionEnd?.(data);
        break;
      case 'agent-update':
        onAgentUpdate?.(data);
        break;
      case 'sparc-update':
        onSPARCUpdate?.(data);
        break;
      case 'quality-gate':
        onQualityGate?.(data);
        break;
      case 'wave-update':
        onWaveUpdate?.(data);
        break;
      case 'performance-update':
        onPerformanceUpdate?.(data);
        break;
      case 'memory-update':
        onMemoryUpdate?.(data);
        break;
      case 'error':
        onError?.(data);
        setLastError(data.message);
        break;
      case 'initial-state':
        // Handle initial state when connecting
        if (data.currentSession) {
          onSessionStart?.(data.currentSession);
        }
        break;
      default:
        console.log('Unhandled WebSocket message type:', type);
    }
  }, [
    onSessionStart,
    onSessionUpdate,
    onSessionEnd,
    onAgentUpdate,
    onSPARCUpdate,
    onQualityGate,
    onWaveUpdate,
    onPerformanceUpdate,
    onMemoryUpdate,
    onError
  ]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({ type: event, data }));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for later sending
      messageQueue.current.push({ event, data });
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Intentional disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    setConnectionAttempts(0);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Initialize connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, reconnect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected) {
        reconnect();
      }
    };

    const handleOffline = () => {
      setLastError('Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, reconnect]);

  return {
    isConnected,
    connectionAttempts,
    lastError,
    sendMessage,
    disconnect,
    reconnect
  };
};