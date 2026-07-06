// hook/socketSingleton.js
import { io } from 'socket.io-client';
import { BACKAPP_SOCKET_URL } from './Useactuatorsync ';

let socket = null;
let currentToken = null;

export function getSocket(authPayload) {
  // Réutilise le socket existant si le token n'a pas changé
  if (socket?.connected && currentToken === authPayload.token) {
    return socket;
  }
  // Déconnecte l'ancien si token changé (changement de compte)
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = authPayload.token;
  console.log("🟢 Socket authPayload:", authPayload);
  socket = io(BACKAPP_SOCKET_URL, {
    auth: authPayload,
    transports: ['polling', 'websocket'],
  });
  return socket;
}

export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}