// hook/useActuatorSync.js (FIX COMPLET)
import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { actuatorStore } from './actuatorStore';

export const BACKAPP_SOCKET_URL = 'http://172.28.40.165:5000';
export const SLIDER_DEBOUNCE_MS = 250;

const DEBUG = true;
const log  = (...args) => DEBUG && console.log('[ActuatorSync]', ...args);
const warn = (...args) => DEBUG && console.warn('[ActuatorSync]', ...args);
const err  = (...args) => console.error('[ActuatorSync]', ...args);

let _socket       = null;
let _currentToken = null;

function getSocket(authPayload) {
  if (_socket?.connected && _currentToken === authPayload.token) {
    log('[SOCKET] ♻️  réutilisation socket existant');
    return _socket;
  }
  if (_socket) {
    log('[SOCKET] 🔄 token changé — déconnexion ancien socket');
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
  _currentToken = authPayload.token;
  log('[SOCKET] 🆕 création nouveau socket');
  _socket = io(BACKAPP_SOCKET_URL, {
    auth:       authPayload,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });
  return _socket;
}

export function destroySocket() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
    _currentToken = null;
    log('[SOCKET] 💥 socket détruit (logout)');
  }
}

const makeStatusKey = (value) =>
  String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const makeKey = (mac, actuatorType) =>
  `${makeStatusKey(mac)}__${actuatorType}`;

const normalizeText = (value) =>
  String(value || '').trim().toLowerCase();

const hasActuatorType = (equipment, actuatorType) =>
  Array.isArray(equipment?.actuators) &&
  equipment.actuators.some((actuator) => actuator?.type === actuatorType);

const coerceOnline = (value) => {
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object') {
    if (typeof value.online === 'boolean') return value.online;
    if (typeof value.isOnline === 'boolean') return value.isOnline;
    if (typeof value.status === 'string') return value.status.toLowerCase() === 'online';
  }
  if (typeof value === 'string') return value.toLowerCase() === 'online';
  return null;
};

export function useActuatorSync({
  userData,
  canSendCommand,
  buildSocketAuth,
  getCommandRoomId,
}) {
  const [actuatorState, setActuatorState] = useState(() => actuatorStore.getAll());

  useEffect(() => {
    const unsub = actuatorStore.subscribe(setActuatorState);
    return unsub;
  }, []);

  const socketRef    = useRef(null);
  const sliderTimers = useRef({});
  const equipmentRef = useRef([]);
  const connectedRef = useRef(false);

  const [connected,    setConnected]    = useState(false);
  const [statesLoaded, setStatesLoaded] = useState(false);

  // ✅ FIX : Meilleure structure pour deviceStatus
  // { 'MAC_UPPERCASE': true/false, ... }
  const [deviceStatus, setDeviceStatus] = useState({});

  const [lastEvent, setLastEvent] = useState(null);
  const [diagLog,   setDiagLog]   = useState([]);

  const addDiag = useCallback((line) => {
    log(line);
    setLastEvent(line);
    setDiagLog((prev) =>
      [`${new Date().toISOString().slice(11, 23)} ${line}`, ...prev].slice(0, 30),
    );
  }, []);

  const getEquipmentIds = useCallback((equipment) => [
    equipment?.mac,
    equipment?.nodeId,
    equipment?._id,
    equipment?.id,
    equipment?.equipmentId,
  ].map(makeStatusKey).filter(Boolean), []);

  const getActuatorKeys = useCallback((mac, actuatorType, meta = {}) => {
    const target = makeStatusKey(mac);
    const keys = new Set();
    if (target) keys.add(`${target}__${actuatorType}`);

    let matchingEquipment = equipmentRef.current.find((equipment) =>
      getEquipmentIds(equipment).includes(target),
    );

    if (!matchingEquipment) {
      const roomId = normalizeText(meta.roomId);
      const room = normalizeText(meta.room);
      const floor = normalizeText(meta.floor);
      const candidates = equipmentRef.current.filter((equipment) => {
        if (!hasActuatorType(equipment, actuatorType)) return false;

        const equipmentRooms = [
          equipment?.roomId,
          equipment?.officeRoom,
          equipment?.room,
        ].map(normalizeText).filter(Boolean);
        const equipmentFloor = normalizeText(equipment?.floor);
        const roomMatches =
          (roomId && equipmentRooms.includes(roomId)) ||
          (room && equipmentRooms.includes(room));
        const floorMatches = !floor || !equipmentFloor || equipmentFloor === floor;

        return roomMatches && floorMatches;
      });

      if (candidates.length === 1) {
        matchingEquipment = candidates[0];
      }
    }

    if (matchingEquipment) {
      getEquipmentIds(matchingEquipment).forEach((id) => {
        keys.add(`${id}__${actuatorType}`);
      });
    }

    return Array.from(keys);
  }, [getEquipmentIds]);

  const syncDeviceStatusSnapshot = useCallback((eqList = [], liveStatuses = {}) => {
    const snapshot = {};
    const put = (key, online) => {
      const normalized = makeStatusKey(key);
      if (normalized && typeof online === 'boolean') {
        snapshot[normalized] = online;
      }
    };

    const raw = liveStatuses?.data ?? liveStatuses?.statuses ?? liveStatuses ?? {};
    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        const online = coerceOnline(entry);
        put(entry?.mac, online);
        put(entry?.nodeId, online);
      });
    } else if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([key, value]) => {
        const online = coerceOnline(value);
        put(key, online);
        put(value?.mac, online);
        put(value?.nodeId, online);
      });
    }

    const list = Array.isArray(eqList) ? eqList : [];
    list.forEach((eq) => {
      const keys = getEquipmentIds(eq);
      const live = keys.map((key) => snapshot[key]).find((value) => typeof value === 'boolean');
      const fallback = typeof eq?.isOnline === 'boolean'
        ? eq.isOnline
        : (typeof eq?.status === 'string' ? eq.status.toLowerCase() === 'online' : null);
      const online = typeof live === 'boolean' ? live : fallback;
      keys.forEach((key) => put(key, online));
    });

    log('[SYNC] device status snapshot:', JSON.stringify(snapshot));
    setDeviceStatus((prev) => ({ ...prev, ...snapshot }));
    return snapshot;
  }, [getEquipmentIds]);

  const getToggle = useCallback((mac, actuatorType) =>
    actuatorState[makeKey(mac, actuatorType)]?.on ?? false,
  [actuatorState]);

  const getSlider = useCallback((mac, actuatorType, defaultValue = 0) =>
    actuatorState[makeKey(mac, actuatorType)]?.value ?? defaultValue,
  [actuatorState]);

  const applyStatus = useCallback((mac, actuatorType, value, meta = {}) => {
    const keys = getActuatorKeys(mac, actuatorType, meta);
    if (keys.length === 0) keys.push(makeKey(mac, actuatorType));
    const primaryKey = keys[0];

    const findPrev = () =>
      keys
        .map((key) => actuatorStore.get(key))
        .find((entry) => entry && Object.keys(entry).length > 0) ?? {};

    if (actuatorType === 'led_strip') {
      const prev = findPrev();
      const rawBrightness = meta.brightness ?? value;
      const brightness = typeof rawBrightness === 'number'
        ? Math.round(rawBrightness)
        : (typeof rawBrightness === 'string' && rawBrightness.trim() !== '' && Number.isFinite(Number(rawBrightness))
          ? Math.round(Number(rawBrightness))
          : (rawBrightness ? (prev.value > 0 ? prev.value : 200) : 0));
      const on = typeof meta.on === 'boolean' ? meta.on : brightness > 0;
      const normalizedBrightness = on && brightness <= 0
        ? (prev.value > 0 ? prev.value : 200)
        : brightness;
      const nextState = {
        on,
        value: normalizedBrightness,
        brightness: normalizedBrightness,
        color: meta.color ?? prev.color ?? '#FFFFFF',
        source: meta.source ?? prev.source ?? null,
      };
      log(`[STATE] 🔑 applyStatus LED  key=${primaryKey}  keys=${keys.length}  brightness=${normalizedBrightness}  on=${on}`);
      keys.forEach((key) => {
        const current = actuatorStore.get(key) ?? prev;
        actuatorStore.set(key, { ...current, ...nextState });
      });
      return;
    }

    if (typeof value === 'boolean' || value === 0 || value === 1) {
      log(`[STATE] 🔑 applyStatus TOGGLE  key=${primaryKey}  keys=${keys.length}  on=${!!value}`);
      keys.forEach((key) => {
        const prev = actuatorStore.get(key) ?? {};
        actuatorStore.set(key, { ...prev, on: !!value });
      });
      return;
    }

    if (typeof value === 'number') {
      log(`[STATE] 🔑 applyStatus SLIDER  key=${primaryKey}  keys=${keys.length}  value=${Math.round(value)}`);
      keys.forEach((key) => {
        const prev = actuatorStore.get(key) ?? {};
        actuatorStore.set(key, { ...prev, value: Math.round(value) });
      });
      return;
    }

    warn(`[STATE] ⚠️  applyStatus type inconnu — key=${primaryKey}  value=`, value, typeof value);
  }, [getActuatorKeys]);

  const requestActuatorStates = useCallback((eqList) => {
    const socket = socketRef.current;

    log(`[SYNC] requestActuatorStates appelé`);
    log(`  socket existe        : ${!!socket}`);
    log(`  socket.connected     : ${socket?.connected}`);
    log(`  connectedRef.current : ${connectedRef.current}`);

    if (!socket?.connected) {
      warn('[SYNC] ⚠️  requestStates skip — socket non connecté');
      addDiag('⚠️ requestStates: socket non connecté');
      return;
    }

    const list = eqList ?? equipmentRef.current;
    const macs = [...new Set(
      list.flatMap((eq) => getEquipmentIds(eq)),
    )];

    log(`[SYNC]   equipmentList.length : ${list.length}`);
    log(`[SYNC]   MACs extraites       : ${JSON.stringify(macs)}`);

    if (macs.length === 0) {
      warn('[SYNC] ⚠️  requestStates skip — aucune MAC dans la liste');
      addDiag('⚠️ requestStates: 0 MACs');
      return;
    }

    log(`[SYNC] 🚀 actuator:requestStates → ${macs.join(', ')}`);
    addDiag(`🚀 requestStates → ${macs.join(', ')}`);
    socket.emit('actuator:requestStates', { macs });
  }, [addDiag, getEquipmentIds]);

  const emitActuatorCommand = useCallback((equipment, actuator, value) => {
    log(`[CMD] emitActuatorCommand — mac=${equipment?.mac}  type=${actuator?.type}  value=${value}`);

    if (!socketRef.current?.connected) {
      err('[CMD] ❌ Socket non connecté');
      addDiag('❌ cmd: socket non connecté');
      return;
    }

    const roomId = getCommandRoomId(equipment, userData);
    log(`[CMD]   roomId résolu : ${roomId}`);
    if (!roomId) {
      err('[CMD] ❌ roomId est null');
      addDiag('❌ cmd: roomId null');
      return;
    }

    const sensorType = actuator.sensorType || 'general';

    let payload = {
      mac:          equipment.mac,
      sensorType,
      actuatorType: actuator.type,
      controlType:  actuator.controlType,
      value,
      frequency:    actuator.frequency ?? undefined,
      roomId,
    };

    if (actuator.type === 'led_strip') {
      const brightness = typeof value === 'number'
        ? Math.round(value)
        : (value ? 200 : 0);

      payload = {
        ...payload,
        controlType: 'led',
        value:       brightness,
        brightness,
        on:          brightness > 0,
        color:       '#FFFFFF',
      };
    }

    log('[CMD] 📤 actuator:command →', JSON.stringify(payload));
    addDiag(`📤 cmd ${actuator.type}=${JSON.stringify(payload.value)}`);
    socketRef.current.emit('actuator:command', payload);
  }, [getCommandRoomId, userData, addDiag]);

  const handleToggle = useCallback((equipment, actuator) => {
    log(`[CMD] handleToggle — type=${actuator?.type}  canSendCommand=${canSendCommand}`);
    if (!canSendCommand) {
      warn('[CMD] ⛔ Toggle bloqué : canSendCommand=false');
      addDiag('⛔ toggle bloqué');
      return;
    }

    const key  = makeKey(equipment.mac, actuator.type);
    const prev = actuatorStore.get(key) ?? {};
    const next = !(prev.on ?? false);

    // Useactuatorsync_.js ligne ~170
if (actuator.type === 'led_strip' || actuator.controlType === 'led') {
  const brightness = next
    ? (prev.value > 0 ? prev.value : 200)  // ← quand ON : utilise prev.value
    : 0;

  actuatorStore.set(key, { on: next, value: brightness });
  emitActuatorCommand(equipment, { ...actuator, controlType: 'led' }, brightness);
} else {
      actuatorStore.set(key, { ...prev, on: next });
      emitActuatorCommand(equipment, actuator, next);
    }
  }, [canSendCommand, emitActuatorCommand, addDiag]);

  const handleSlider = useCallback((equipment, actuator, value) => {
    if (!canSendCommand) return;

    const key  = makeKey(equipment.mac, actuator.type);
    const prev = actuatorStore.get(key) ?? {};

    actuatorStore.set(key, { ...prev, value: Math.round(value), on: value > 0 });
clearTimeout(sliderTimers.current[key]);
sliderTimers.current[key] = setTimeout(() => {
  emitActuatorCommand(equipment, actuator, Math.round(value));
}, SLIDER_DEBOUNCE_MS);
  }, [canSendCommand, emitActuatorCommand]);

  useEffect(() => {
    const authPayload = buildSocketAuth(userData);
    log('═══ Initialisation socket ═══');
    log('  URL  :', BACKAPP_SOCKET_URL);
    log('  auth :', JSON.stringify(authPayload));

    const socket = getSocket(authPayload);
    socketRef.current = socket;

    if (socket.connected) {
      connectedRef.current = true;
      setConnected(true);
      if (equipmentRef.current.length > 0) {
        requestActuatorStates(equipmentRef.current);
      }
    }

    const onConnect = () => {
      log(`[SOCKET] ✅ connecté — id=${socket.id}`);
      connectedRef.current = true;
      setConnected(true);
      setStatesLoaded(false);
      addDiag(`✅ connecté id=${socket.id}`);

      if (equipmentRef.current.length > 0) {
        // ✅ FIX : demander les états IMMÉDIATEMENT après connection
        setTimeout(() => {
          requestActuatorStates(equipmentRef.current);
        }, 200);
      }
    };

    const onConnectError = (e) => {
      err(`[SOCKET] ❌ connect_error : ${e.message}`);
      connectedRef.current = false;
      setConnected(false);
      addDiag(`❌ connect_error: ${e.message}`);
    };

    const onDisconnect = (reason) => {
      warn(`[SOCKET] ⚠️  déconnecté : ${reason}`);
      connectedRef.current = false;
      setConnected(false);
      addDiag(`⚠️ disconnect: ${reason}`);
    };

    const onAck = ({ mac, actuatorType, value, on, brightness, color, source, roomId, floor, room }) => {
      log(`[SYNC] ✅ ack — mac=${mac}  type=${actuatorType}  value=${JSON.stringify(value)}`);
      applyStatus(mac, actuatorType, value, { on, brightness, color, source, roomId, floor, room });
      addDiag(`✅ ack ${actuatorType}=${JSON.stringify(value)}`);
    };

    const onStatus = (payload) => {
      log('[SYNC] 📥 actuator:status :', JSON.stringify(payload));
      const { mac, actuatorType, value, on, brightness, color, source, roomId, floor, room } = payload ?? {};
      if (!mac || !actuatorType) return;
      applyStatus(mac, actuatorType, value, { on, brightness, color, source, roomId, floor, room });
      setStatesLoaded(true);
      addDiag(`📥 status ${actuatorType}=${value}`);
    };

    const onStates = (payload) => {
      log('[SYNC] 📥 actuator:states :', JSON.stringify(payload));
      if (!Array.isArray(payload)) {
        warn('[SYNC] ⚠️  actuator:states payload non-array :', typeof payload, payload);
        addDiag(`⚠️ states non-array: ${typeof payload}`);
        return;
      }
      log(`[SYNC]   ${payload.length} entrée(s) reçues`);
      payload.forEach(({ mac, actuatorType, value, on, brightness, color, source, roomId, floor, room }, i) => {
        log(`[SYNC]   [${i}] mac=${mac}  type=${actuatorType}  value=${JSON.stringify(value)}`);
        applyStatus(mac, actuatorType, value, { on, brightness, color, source, roomId, floor, room });
      });
      setStatesLoaded(true);
      addDiag(`📥 bulk states: ${payload.length} entrées`);
    };

    // ✅ FIX : Meilleure gestion du statut online/offline
    const onDeviceOnline = ({ mac }) => {
      if (!mac) return;
      const upperMac = mac.toUpperCase();
      log(`[SOCKET] 🟢 device:online — mac=${upperMac}`);
      setDeviceStatus((prev) => {
        // ✅ Ne re-render que si le statut change
        if (prev[upperMac] === true) return prev;
        return { ...prev, [upperMac]: true };
      });
      addDiag(`🟢 online: ${upperMac}`);
      
      // ✅ FIX : Demander les états du device qui vient de se connecter
      const eq = equipmentRef.current.find(
        (e) => (e.mac || '').toUpperCase() === upperMac,
      );
      if (eq) {
        setTimeout(() => requestActuatorStates([eq]), 100);
      }
    };

    const onDeviceOffline = ({ mac }) => {
      if (!mac) return;
      const upperMac = mac.toUpperCase();
      log(`[SOCKET] 🔴 device:offline — mac=${upperMac}`);
      setDeviceStatus((prev) => {
        // ✅ Ne re-render que si le statut change
        if (prev[upperMac] === false) return prev;
        return { ...prev, [upperMac]: false };
      });
      addDiag(`🔴 offline: ${upperMac}`);
    };

    const onActuatorError = (data) => {
      err(`[SYNC] ❌ actuator:error :`, data);
      addDiag(`❌ error: ${data?.message}`);
    };

    socket.on('connect',         onConnect);
    socket.on('connect_error',   onConnectError);
    socket.on('disconnect',      onDisconnect);
    socket.on('actuator:ack',    onAck);
    socket.on('actuator:status', onStatus);
    socket.on('actuator:states', onStates);
    socket.on('actuator:error',  onActuatorError);
    socket.on('device:online',   onDeviceOnline);
    socket.on('device:offline',  onDeviceOffline);

    return () => {
      log('[SOCKET] cleanup — retrait des listeners (socket conservé)');
      socket.off('connect',         onConnect);
      socket.off('connect_error',   onConnectError);
      socket.off('disconnect',      onDisconnect);
      socket.off('actuator:ack',    onAck);
      socket.off('actuator:status', onStatus);
      socket.off('actuator:states', onStates);
      socket.off('actuator:error',  onActuatorError);
      socket.off('device:online',   onDeviceOnline);
      socket.off('device:offline',  onDeviceOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.token, userData?.roomId, userData?.officeRoom, userData?.floor]);

  return {
    getToggle,
    getSlider,
    handleToggle,
    handleSlider,
    requestActuatorStates,
    connected,
    connectedRef,
    statesLoaded,
    deviceStatus,
    syncDeviceStatusSnapshot,
    lastEvent,
    diagLog,
    equipmentRef,
  };
}
