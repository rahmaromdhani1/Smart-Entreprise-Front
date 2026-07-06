import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const socketInstance = io('http://172.28.40.165:5000', {
  transports: ['websocket'],
  reconnection: true,
  autoConnect: false,
});

export const updateSocketAuth = (token, userFields = {}) => {
  socketInstance.auth = { token, ...userFields };
  socketInstance.connect();
};

export const disconnectSocket = () => {
  socketInstance.disconnect();
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    socketInstance.on('connect', () => {
      console.log('[SOCKET] connecté:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[SOCKET] déconnecté:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.log('[SOCKET] erreur connexion:', err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);