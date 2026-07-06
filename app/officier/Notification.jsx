// Notification.jsx
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  X,
} from "lucide-react-native";

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { io } from "socket.io-client";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const socket = io("http://172.28.40.165:5000");

// ─── Configure comment les notifs s'affichent quand l'app est au premier plan ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Demande la permission et retourne le token (optionnel pour local notifs) ──
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  });
  console.log("Expo Push Token:", token.data);
  return token.data;
}

// ─── Envoie une notification locale (push popup Android/iOS) ────────────────
const sendLocalNotification = async (alert) => {
  const title = alert.type ? alert.type.toUpperCase() : 'ALERT';
  const body  = alert.message || '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data:  { level: alert.level },
      sound: true,
      // Android : couleur de l'icône selon la sévérité
      color: alert.level === 'critical' ? '#EF4444'
           : alert.level === 'warning'  ? '#F59E0B'
           : '#8B5CF6',
    },
    trigger: null, // immédiat
  });
};

// ─── Toast popup component ────────────────────────────────────────────────────
const ToastNotification = ({ toast, onDismiss }) => {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), 4500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const borderColor =
    toast.level === 'critical' ? '#EF4444' :
    toast.level === 'warning'  ? '#F59E0B' : '#8B5CF6';

  const IconComp =
    toast.level === 'critical' ? AlertCircle :
    toast.level === 'warning'  ? AlertTriangle : Info;

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], borderLeftColor: borderColor }]}>
      <IconComp size={20} color={borderColor} strokeWidth={2} style={{ flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>
      </View>
      <Pressable onPress={dismiss} hitSlop={10}>
        <X size={16} color="#9CA3AF" strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────
export const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const NotificationsPage = ({ userData, onUnreadCountChange }) => {
  const [notifications, setNotifications]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [toasts, setToasts]                 = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [expoPushToken, setExpoPushToken] = useState('');
  const formatTime = (date) => new Date(date).toLocaleString();

  // ── Demande la permission au montage ──────────────────────────────────────
  useEffect(() => {
  registerForPushNotificationsAsync().then((token) => {
    if (token) setExpoPushToken(token);
  });
}, []);

  const incrementUnread = () => {
    setUnreadCount(prev => {
      const next = prev + 1;
      onUnreadCountChange?.(next);
      return next;
    });
  };

  // Reset badge quand l'utilisateur ouvre la page
  useEffect(() => {
    setUnreadCount(0);
    onUnreadCountChange?.(0);
  }, []);

  const hasAccessToAlert = (alert, userData) => {
    const floor = alert?.meta?.floor;
    const room  = alert?.meta?.room;
    const primaryMatch = floor === userData?.floor && room === userData?.officeRoom;
    const extraMatch   = userData?.additionalAccess?.some(
      access => access?.floor === floor && access?.officeRoom === room
    );
    return primaryMatch || extraMatch;
  };

  const pushToast = (alert) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, {
      id,
      level:   alert.level,
      title:   alert.type ? alert.type.toUpperCase() : 'ALERT',
      message: alert.message,
    }]);
    incrementUnread();

    // 🔔 Push notification Android système
    sendLocalNotification(alert);
  };

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    fetch("http://172.28.40.165:5000/api/alerts")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const filtered = data.filter(alert => hasAccessToAlert(alert, userData));
          const mapped   = filtered.map(alert => ({
            _id:     alert._id,
            type:    alert.level,
            title:   alert.type ? alert.type.toUpperCase() : "ALERT",
            message: alert.message,
            time:    formatTime(alert.createdAt),
          }));
          setNotifications(mapped);
        } else {
          setNotifications([]);
        }
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [userData]);

  useEffect(() => {
    socket.on("new-alert", (alert) => {
      if (!hasAccessToAlert(alert, userData)) return;

      const mapped = {
        _id:     alert._id,
        type:    alert.level,
        title:   alert.type ? alert.type.toUpperCase() : "ALERT",
        message: alert.message,
        time:    formatTime(alert.createdAt),
      };
      setNotifications(prev => [mapped, ...(prev || [])]);
      pushToast(alert);
    });
    return () => socket.off("new-alert");
  }, [userData]);

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
      case "critical": return <AlertCircle  size={22} color={color} strokeWidth={2} />;
      case "warning":  return <AlertTriangle size={22} color={color} strokeWidth={2} />;
      case "info":     return <Info          size={22} color={color} strokeWidth={2} />;
      default:         return <Bell          size={22} color={color} strokeWidth={2} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Toast layer */}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastNotification key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Notifications & Alerts</Text>
          <Text style={styles.pageSubtitle}>Stay informed in real time</Text>
        </View>

        <View style={styles.notificationsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification, index) => {
              const notifStyle = getNotificationStyle(notification.type);
              return (
                <View
                  key={notification._id || index}
                  style={[styles.notificationCard, { borderLeftColor: notifStyle.borderColor }]}
                >
                  <View style={[styles.notificationIcon, { backgroundColor: notifStyle.iconBg }]}>
                    {getIcon(notification.type, notifStyle.iconColor)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll see alerts and updates here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F8F7FC' },
  pageHeader:          { marginBottom: 32, paddingHorizontal: 24, paddingTop: 24 },
  bellWrapper:         { position: 'relative', alignSelf: 'flex-start', marginBottom: 12 },
  pageTitle:           { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  pageSubtitle:        { fontSize: 16, color: '#6B7280' },
  notificationsList:   { paddingHorizontal: 24, marginBottom: 32 },
  notificationCard:    { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4, flexDirection: 'row', gap: 16, alignItems: 'flex-start', borderLeftWidth: 4, marginBottom: 16 },
  notificationIcon:    { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationContent: { flex: 1 },
  notificationTitle:   { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  notificationMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 8 },
  notificationTime:    { fontSize: 13, color: '#6B7280' },
  loadingContainer:    { padding: 40, alignItems: 'center' },
  loadingText:         { fontSize: 16, color: '#6B7280' },
  emptyContainer:      { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText:           { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtext:        { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  // Badge
  badge:     { position: 'absolute', top: -6, right: -8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#F8F7FC' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', lineHeight: 14 },

  // Toast
  toastContainer: { position: 'absolute', top: 16, left: 16, right: 16, zIndex: 999, gap: 8 },
  toast:          { backgroundColor: '#FFFFFF', borderRadius: 14, borderLeftWidth: 4, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  toastTitle:     { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  toastMessage:   { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});

export default NotificationsPage;