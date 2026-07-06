import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../Service/userservice'; // ← réutilise le service

const BACK_APP_URL = 'http://172.28.40.165:5000';

export function useSensorSocket() {
  const socketRef  = useRef(null);
  const userRef    = useRef(null);
  const [latestByRoom, setLatestByRoom] = useState({});
  const [connected, setConnected]       = useState(false);

  const handleSensorData = useCallback((data) => {
    console.log('[useSensorSocket] data reçu:', data.sensorType, data.value);
    const { sensorType, floor, room, value, unit, ts } = data;
    const key = `${floor}:${room}`;
    setLatestByRoom((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        floor,
        room,
        [sensorType]: { value, unit, ts },
      },
    }));
  }, []);

  useEffect(() => {
    const init = async () => {
     try {
    const raw = await AsyncStorage.getItem('userData');
    if (raw) userRef.current = JSON.parse(raw);
  } catch (e) {
    console.warn('[useSensorSocket] AsyncStorage failed:', e.message);
  } try {
    const fullUser = await getUserProfile();
    console.log('[useSensorSocket] profil API raw:', JSON.stringify(fullUser));
    if (fullUser) {
      userRef.current = { ...userRef.current, ...fullUser };
    }
  } catch (e) {
    console.warn('[useSensorSocket] getUserProfile failed:', e.message, e?.response?.status, e?.response?.data);
  }

  // ── 3. Socket ─────────────────────────────────────────────
  const socket = io(BACK_APP_URL, {
    transports:        ['websocket'],
    reconnection:      true,
    reconnectionDelay: 3000,
  });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[useSensorSocket] Connecté id=', socket.id);
        setConnected(true);

        const user = userRef.current;
        console.log('[useSensorSocket] identify avec:', user?.role, user?.floor, user?.officeRoom);

        socket.emit('identify', {
          role:             user?.role             || 'Staff',
          floor:            user?.floor            ?? null,
          officeRoom:       user?.officeRoom        ?? null,
          additionalAccess: user?.additionalAccess  || [],
        });
      });

      socket.on('disconnect', (reason) => {
        console.warn('[useSensorSocket] Déconnecté:', reason);
        setConnected(false);
      });

      socket.on('sensor:data', handleSensorData);
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('sensor:data', handleSensorData);
        socketRef.current.disconnect();
      }
    };
  }, [handleSensorData]);

  return { latestByRoom, connected };
}