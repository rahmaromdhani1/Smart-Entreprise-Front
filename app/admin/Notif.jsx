import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  CheckCircle,
  Cpu,
} from "lucide-react-native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { io } from "socket.io-client";
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddEquipment from '../admin/AddEquipment';

const BACK_SOCKET_URL = "http://172.28.40.165:5000";
const BACKM_DEVICES_URL = "http://172.28.40.165:5050";
const DEVICE_NOTIFICATIONS_STORAGE_KEY = 'admin-device-notifications';

const socket = io(BACKM_DEVICES_URL);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function createEventId(prefix, mac) {
  return `${prefix}-${mac}-${Date.now()}`;
}

function normalizeLocationValue(value, fallback) {
  if (!value || value === 'unknown') return fallback;
  return value;
}

function formatLocation(floor, room) {
  return `${normalizeLocationValue(floor, 'unknown floor')} · ${normalizeLocationValue(room, 'unknown room')}`;
}

function mergeNotificationLists(existing, incoming) {
  const seen = new Set();
  return [...existing, ...incoming].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

function toDeviceNotification(device) {
  return {
    id: device.mac,
    type: 'device',
    title: 'New Device Detected',
    message: `MAC: ${device.mac} · IP: ${device.ip} · Firmware: ${device.firmware || 'unknown'}`,
    mac: device.mac,
    ip: device.ip,
    timestamp: device.firstSeen || new Date().toISOString(),
    status: 'pending',
    action: 'assign',
  };
}

function DeviceNotificationCard({ n, onClear, onAssign }) {
  const isReady   = n.status === 'ready';
  const isOffline = n.status === 'offline';
  const isOnline  = n.status === 'online';

  let borderColor   = '#8B5CF6';
  let iconBg        = 'rgba(139, 92, 246, 0.1)';
  let iconColor     = '#8B5CF6';
  let IconComponent = Cpu;

  if (isReady || isOnline) {
    borderColor = '#10B981'; iconBg = 'rgba(16, 185, 129, 0.1)'; iconColor = '#10B981'; IconComponent = CheckCircle;
  } else if (isOffline) {
    borderColor = '#F59E0B'; iconBg = 'rgba(245, 158, 11, 0.1)'; iconColor = '#F59E0B'; IconComponent = AlertTriangle;
  }

  return (
    <View style={[styles.notificationCard, { borderLeftColor: borderColor }]}>
      <View style={[styles.notificationIcon, { backgroundColor: iconBg }]}>
        <IconComponent size={22} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{n.title}</Text>
        <Text style={styles.notificationMessage}>{n.message}</Text>
        {n.mac && <Text style={styles.deviceMeta}>MAC: {n.mac}</Text>}
        <Text style={styles.notificationTime}>{relativeTime(n.timestamp)}</Text>
        <View style={styles.deviceActions}>
          {n.action === 'assign' && (
            <TouchableOpacity style={styles.assignBtn} onPress={() => onAssign(n)} activeOpacity={0.8}>
              <Text style={styles.assignBtnText}>Assign Device →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.clearBtn} onPress={() => onClear(n)} activeOpacity={0.8}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const NotificationsPage = ({ userData, onUnreadCountChange }) => {
  const [notifications, setNotifications]     = useState([]);
  const [expoPushToken, setExpoPushToken]     = useState('');
  const [deviceNotifications, setDeviceNotifications] = useState([]);
  const [, setTick]                           = useState(0);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignTarget, setAssignTarget]       = useState(null);

  const notificationListener = React.useRef();
  const responseListener     = React.useRef();

  // ── Reset badge à l'ouverture de la page ──────────────────────────────────
  useEffect(() => {
    onUnreadCountChange?.(0);
  }, []);

  // ── Persistance AsyncStorage ───────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DEVICE_NOTIFICATIONS_STORAGE_KEY)
      .then((saved) => { if (saved) setDeviceNotifications(JSON.parse(saved)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(DEVICE_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(deviceNotifications)).catch(() => {});
  }, [deviceNotifications]);

  // ── Fetch unregistered devices au montage ─────────────────────────────────
  useEffect(() => {
    async function fetchUnregistered() {
      try {
        const res = await fetch(`${BACKM_DEVICES_URL}/api/devices/unregistered`);
        const { data } = await res.json();
        setDeviceNotifications((prev) => mergeNotificationLists(prev, data.map(toDeviceNotification)));
      } catch (err) {
        console.error('[NotificationsPage] Failed to fetch unregistered devices:', err);
      }
    }
    fetchUnregistered();
  }, []);

  // ── Ticker pour relativeTime ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (date) => new Date(date).toLocaleString();

  // ── Push notifications ─────────────────────────────────────────────────────
  async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig.extra.eas.projectId,
    });
    console.log("Expo Push Token:", token.data);
    return token.data;
  }

  async function sendLocalNotification(alert) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.type ? alert.type.toUpperCase() : "ALERT",
        body: alert.message,
        data: { alertId: alert._id, level: alert.level },
        sound: true,
        priority: alert.level === 'critical'
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => setExpoPushToken(token));
    notificationListener.current = Notifications.addNotificationReceivedListener((n) => console.log('Notification reçue:', n));
    responseListener.current     = Notifications.addNotificationResponseReceivedListener((r) => console.log('Notification cliquée:', r));
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // ── Fetch alertes système ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BACK_SOCKET_URL}/api/alerts`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data.map((alert) => ({
            _id:     alert._id,
            type:    alert.level,
            title:   alert.type ? alert.type.toUpperCase() : "ALERT",
            message: alert.message,
            time:    formatTime(alert.createdAt),
          })));
        } else {
          setNotifications([]);
        }
      })
      .catch(() => setNotifications([]));
  }, []);

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Nouvelle alerte système
    socket.on("new-alert", (alert) => {
      const mapped = {
        _id:     alert._id,
        type:    alert.level,
        title:   alert.type ? alert.type.toUpperCase() : "ALERT",
        message: alert.message,
        time:    formatTime(alert.createdAt),
      };
      setNotifications((prev) => {
        const next = [mapped, ...prev];
        // Incrémente le badge dans MainApp
        onUnreadCountChange?.(next.length + deviceNotifications.length);
        return next;
      });
      sendLocalNotification(alert);
    });

    // Nouveau device non enregistré
    const onUnregistered = (device) => {
      setDeviceNotifications((prev) => {
        if (prev.find((n) => n.id === device.mac)) return prev;
        const next = [toDeviceNotification(device), ...prev];
        // Incrémente le badge dans MainApp
        onUnreadCountChange?.((c) => {
          // On ne peut pas lire notifications ici directement, on incrémente de 1
          return typeof c === 'number' ? c + 1 : 1;
        });
        return next;
      });
    };

    const onReady = ({ mac, nodeId, floor, room }) => {
      setDeviceNotifications((prev) =>
        prev.map((n) =>
          n.id === mac
            ? { ...n, type: 'success', title: `Node ${nodeId} is Ready`, message: `Registered · ${formatLocation(floor, room)}`, floor, room, timestamp: new Date().toISOString(), status: 'ready', action: null }
            : n
        )
      );
    };

    const onOffline = ({ mac, nodeId, floor, room, reason }) => {
      setDeviceNotifications((prev) => {
        const next = [{
          id:        createEventId('offline', mac),
          type:      'warning',
          title:     `${nodeId || mac} Lost Connection`,
          message:   `${formatLocation(floor, room)} · ${reason === 'unexpected' ? 'Unexpected disconnection' : reason || 'Unexpected disconnection'}`,
          mac, nodeId, floor, room,
          timestamp: new Date().toISOString(),
          status:    'offline',
          action:    null,
        }, ...prev];
        onUnreadCountChange?.((c) => typeof c === 'number' ? c + 1 : 1);
        return next;
      });
    };

    const onOnline = ({ mac, nodeId, floor, room }) => {
      setDeviceNotifications((prev) => [{
        id:        createEventId('online', mac),
        type:      'success',
        title:     `${nodeId || mac} Back Online`,
        message:   `${formatLocation(floor, room)} · Device reconnected successfully`,
        mac, nodeId, floor, room,
        timestamp: new Date().toISOString(),
        status:    'online',
        action:    null,
      }, ...prev]);
    };

    socket.on('device:unregistered', onUnregistered);
    socket.on('device:ready',        onReady);
    socket.on('device:offline',      onOffline);
    socket.on('device:online',       onOnline);

    return () => {
      socket.off("new-alert");
      socket.off('device:unregistered', onUnregistered);
      socket.off('device:ready',        onReady);
      socket.off('device:offline',      onOffline);
      socket.off('device:online',       onOnline);
    };
  }, [deviceNotifications]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const clearDeviceNotification = async (notification) => {
    setDeviceNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    if (notification.status !== 'pending' || !notification.mac) return;
    try {
      await fetch(`${BACKM_DEVICES_URL}/api/devices/unregistered/${notification.mac}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[NotificationsPage] Failed to clear unregistered device:', err);
    }
  };

  const clearAllDeviceNotifications = () => {
    Alert.alert(
      'Clear All Device Alerts',
      'Are you sure you want to clear all device alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => setDeviceNotifications([]) },
      ]
    );
  };

  const handleAssignDevice = (notification) => {
    setAssignTarget({ mac: notification.mac, ip: notification.ip });
    setAssignModalVisible(true);
  };

  const handleAssignSuccess = (created) => {
    setAssignModalVisible(false);
    if (assignTarget?.mac) {
      setDeviceNotifications((prev) =>
        prev.map((n) =>
          n.mac === assignTarget.mac
            ? { ...n, action: null, status: 'ready', title: `Node ${created?.nodeId || 'assigned'}`, message: 'Equipment created successfully' }
            : n
        )
      );
    }
    setAssignTarget(null);
  };

  // ── Styles dynamiques ──────────────────────────────────────────────────────
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'critical': return { borderColor: '#EF4444', iconBg: 'rgba(239, 68, 68, 0.1)',  iconColor: '#EF4444' };
      case 'warning':  return { borderColor: '#F59E0B', iconBg: 'rgba(245, 158, 11, 0.1)', iconColor: '#F59E0B' };
      case 'info':     return { borderColor: '#8B5CF6', iconBg: 'rgba(139, 92, 246, 0.1)', iconColor: '#8B5CF6' };
      default:         return { borderColor: '#E5E7EB', iconBg: '#F8F7FC',                 iconColor: '#6B7280' };
    }
  };

  const getIcon = (level, color) => {
    switch (level) {
      case "critical": return <AlertCircle   size={22} color={color} strokeWidth={2} />;
      case "warning":  return <AlertTriangle size={22} color={color} strokeWidth={2} />;
      case "info":     return <Info          size={22} color={color} strokeWidth={2} />;
      default:         return <Bell          size={22} color={color} strokeWidth={2} />;
    }
  };

  const totalCount    = deviceNotifications.length + notifications.length;
  const criticalCount = notifications.filter((n) => n.type === 'critical').length;
  const warningCount  = notifications.filter((n) => n.type === 'warning').length + deviceNotifications.filter((n) => n.status === 'offline').length;
  const infoCount     = notifications.filter((n) => n.type === 'info').length;
  const deviceCount   = deviceNotifications.length;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Notifications & Alerts</Text>
              <Text style={styles.subtitle}>Stay informed in real time</Text>
            </View>
            {deviceNotifications.length > 0 && (
              <TouchableOpacity style={styles.clearAllBtn} onPress={clearAllDeviceNotifications} activeOpacity={0.8}>
                <Text style={styles.clearAllBtnText}>Clear All Device Alerts</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Device Notifications */}
        {deviceNotifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Device Events</Text>
              <Text style={styles.sectionCount}>{deviceNotifications.length} active</Text>
            </View>
            {deviceNotifications.map((n) => (
              <DeviceNotificationCard key={n.id} n={n} onClear={clearDeviceNotification} onAssign={handleAssignDevice} />
            ))}
          </View>
        )}

        {/* System Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>System Notifications</Text>
            <Text style={styles.sectionCount}>{notifications.length} alerts</Text>
          </View>
          <View style={styles.notificationsList}>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notif, index) => {
                const notifStyle = getNotificationStyle(notif.type);
                return (
                  <View key={notif._id || index} style={[styles.notificationCard, { borderLeftColor: notifStyle.borderColor }]}>
                    <View style={[styles.notificationIcon, { backgroundColor: notifStyle.iconBg }]}>
                      {getIcon(notif.type, notifStyle.iconColor)}
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationMessage}>{notif.message}</Text>
                      <Text style={styles.notificationTime}>{notif.time}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Notification Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={styles.statLabel}>Total</Text><Text style={styles.statValue}>{totalCount}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Critical</Text><Text style={[styles.statValue, { color: '#EF4444' }]}>{criticalCount}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Warnings</Text><Text style={[styles.statValue, { color: '#F59E0B' }]}>{warningCount}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Info</Text><Text style={[styles.statValue, { color: '#3B82F6' }]}>{infoCount}</Text></View>
            <View style={styles.statItem}><Text style={styles.statLabel}>Devices</Text><Text style={[styles.statValue, { color: '#8B5CF6' }]}>{deviceCount}</Text></View>
          </View>
        </View>
      </ScrollView>

      {/* Modal AddEquipment */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => { setAssignModalVisible(false); setAssignTarget(null); }}
      >
        <AddEquipment
          prefillMac={assignTarget?.mac || ''}
          prefillIp={assignTarget?.ip  || ''}
          onClose={() => { setAssignModalVisible(false); setAssignTarget(null); }}
          onSuccess={handleAssignSuccess}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#F8F7FC' },
  header:               { paddingHorizontal: 24, paddingTop: 24, marginBottom: 8 },
  headerRow:            { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title:                { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle:             { fontSize: 16, color: '#6B7280' },
  section:              { paddingHorizontal: 24, marginTop: 24 },
  sectionTitleRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:         { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionCount:         { fontSize: 13, color: '#6B7280' },
  notificationsList:    { marginBottom: 8 },
  notificationCard:     { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderLeftWidth: 4, flexDirection: 'row', gap: 16, alignItems: 'flex-start', shadowColor: '#8B5CF6', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 20, elevation: 4, marginBottom: 16 },
  notificationIcon:     { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationContent:  { flex: 1 },
  notificationTitle:    { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  notificationMessage:  { fontSize: 14, color: '#6B7280', marginBottom: 8, lineHeight: 20 },
  notificationTime:     { fontSize: 13, color: '#9CA3AF' },
  emptyContainer:       { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText:            { fontSize: 16, color: '#6B7280', marginTop: 16 },
  deviceMeta:           { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  deviceActions:        { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  assignBtn:            { backgroundColor: '#8B5CF6', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, flex: 1, minWidth: 120, alignItems: 'center' },
  assignBtnText:        { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  clearBtn:             { backgroundColor: '#F3F4F6', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  clearBtnText:         { color: '#374151', fontSize: 13, fontWeight: '600' },
  clearAllBtn:          { backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  clearAllBtnText:      { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  summaryCard:          { backgroundColor: '#FFFFFF', marginHorizontal: 24, marginTop: 32, marginBottom: 32, borderRadius: 16, padding: 20, shadowColor: '#8B5CF6', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 20, elevation: 4 },
  summaryTitle:         { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem:             { flex: 1, minWidth: '28%', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, alignItems: 'center' },
  statLabel:            { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  statValue:            { fontSize: 22, fontWeight: '700', color: '#111827' },
});

export default NotificationsPage;