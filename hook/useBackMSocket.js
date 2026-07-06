'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const BackMSocketContext = createContext(null);

let backMSocket = null;

function getBackMSocket() {
  if (!backMSocket) {
    backMSocket = io("http://172.28.40.165:5050", {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 3000,
    });
  }

  return backMSocket;
}

export function BackMSocketProvider({ children }) {
  const [socket] = useState(() => getBackMSocket());
  const [connected, setConnected] = useState(() => socket.connected);

  useEffect(() => {
    const handleConnect = () => {
      console.log('[BackM Socket] connected:', socket.id);
      setConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.log('[BackM Socket] disconnected:', reason);
      setConnected(false);
    };

    const handleConnectError = (error) => {
      console.error('[BackM Socket] connect error:', error.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);

      // Do NOT reset backMSocket here during development
    };
  }, [socket]);

  return (
    <BackMSocketContext.Provider value={{ socket, connected }}>
      {children}
    </BackMSocketContext.Provider>
  );
}

export function useBackMSocket() {
  const ctx = useContext(BackMSocketContext);

  if (!ctx) {
    throw new Error('useBackMSocket must be used within a BackMSocketProvider');
  }

  return ctx;
}