// admin/home.jsx (MainApp)
import React, { useState, useEffect } from 'react';
import {
  View, Text, Image as RNImage, StyleSheet,
  TouchableOpacity, ScrollView, Platform, Alert, SafeAreaView,
} from 'react-native';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import {
  LayoutDashboard, SlidersHorizontal, Settings,
  Bell, BarChart3, Users, LogOut,
} from 'lucide-react-native';

import AdminDashboard  from './dashboard';
import ControlPage     from './Tcontrol';
import NotificationsPage from './Notif';
import ReportsPage     from './Historique';
import UsersPage       from './Users';
import AdminSettings   from './settingsA';
import { useSocket }   from '../../context/SocketContext';

// ─── URLs ──────────────────────────────────────────────────────────────────────
const BACK_SOCKET_URL   = 'http://172.28.40.165:5000';
const BACKM_DEVICES_URL = 'http://172.28.40.165:5050';

// ─── Sockets globaux persistants ──────────────────────────────────────────────
const alertSocket  = io(BACK_SOCKET_URL);
const deviceSocket = io(BACKM_DEVICES_URL);

// ─── Notification handler ──────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// ─── Push permission + token ───────────────────────────────────────────────────
export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  console.log('Expo Push Token (Admin):', token.data);
  return token.data;
};

// ─── Local push helpers ────────────────────────────────────────────────────────
async function sendAlertPush(alert) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.type ? alert.type.toUpperCase() : 'ALERT',
      body:  alert.message || '',
      sound: true,
      color: alert.level === 'critical' ? '#EF4444'
           : alert.level === 'warning'  ? '#F59E0B' : '#8B5CF6',
    },
    trigger: null,
  });
}

async function sendDevicePush(title, body, color = '#8B5CF6') {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, color },
    trigger: null,
  });
}

// ─── Location helper ───────────────────────────────────────────────────────────
function formatLocation(floor, room) {
  const f = (!floor || floor === 'unknown') ? 'unknown floor' : floor;
  const r = (!room  || room  === 'unknown') ? 'unknown room'  : room;
  return `${f} · ${r}`;
}

// ══════════════════════════════════════════════════════════════════════════════
const MainApp = ({ userData, onLogout }) => {
  const [activePage,  setActivePage]  = useState('dashboard');
  const [user,        setUser]        = useState(userData);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket }                    = useSocket();

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => socket.emit('user:heartbeat'), 30000);
    return () => clearInterval(interval);
  }, [socket]);

  // ── Sync userData ──────────────────────────────────────────────────────────
  useEffect(() => { setUser(userData); }, [userData]);

  // ── Push permission au montage ─────────────────────────────────────────────
  useEffect(() => { registerForPushNotificationsAsync(); }, []);

  // ── Reset badge quand on ouvre la page notifications ──────────────────────
  useEffect(() => {
    if (activePage === 'notifications') setUnreadCount(0);
  }, [activePage]);

  // ── SOCKET PERSISTANT : system alerts ─────────────────────────────────────
  useEffect(() => {
    const onNewAlert = (alert) => {
      sendAlertPush(alert);
      setActivePage(page => {
        if (page !== 'notifications') setUnreadCount(c => c + 1);
        return page;
      });
    };

    alertSocket.on('new-alert', onNewAlert);
    return () => alertSocket.off('new-alert', onNewAlert);
  }, []);

  // ── SOCKET PERSISTANT : device events ─────────────────────────────────────
  useEffect(() => {
    const onOffline = ({ mac, nodeId, floor, room, reason }) => {
      const label = nodeId || mac;
      sendDevicePush(
        `${label} Lost Connection`,
        `${formatLocation(floor, room)} · ${reason === 'unexpected' ? 'Unexpected disconnection' : reason || 'Unexpected disconnection'}`,
        '#F59E0B'
      );
      setActivePage(page => {
        if (page !== 'notifications') setUnreadCount(c => c + 1);
        return page;
      });
    };

    const onOnline = ({ mac, nodeId, floor, room }) => {
      sendDevicePush(
        `${nodeId || mac} Back Online`,
        `${formatLocation(floor, room)} · Reconnected successfully`,
        '#10B981'
      );
      setActivePage(page => {
        if (page !== 'notifications') setUnreadCount(c => c + 1);
        return page;
      });
    };

    const onReady = ({ mac, nodeId, floor, room }) => {
      sendDevicePush(
        `Node ${nodeId || mac} is Ready`,
        `Registered · ${formatLocation(floor, room)}`,
        '#10B981'
      );
      setActivePage(page => {
        if (page !== 'notifications') setUnreadCount(c => c + 1);
        return page;
      });
    };

    const onUnregistered = (device) => {
      sendDevicePush(
        'New Device Detected',
        `MAC: ${device.mac} · IP: ${device.ip}`,
        '#8B5CF6'
      );
      setActivePage(page => {
        if (page !== 'notifications') setUnreadCount(c => c + 1);
        return page;
      });
    };

    deviceSocket.on('device:offline',      onOffline);
    deviceSocket.on('device:online',       onOnline);
    deviceSocket.on('device:ready',        onReady);
    deviceSocket.on('device:unregistered', onUnregistered);

    return () => {
      deviceSocket.off('device:offline',      onOffline);
      deviceSocket.off('device:online',       onOnline);
      deviceSocket.off('device:ready',        onReady);
      deviceSocket.off('device:unregistered', onUnregistered);
    };
  }, []);

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const getAvatarUrl = () => {
    if (!user?.avatarImage) return null;
    if (user.avatarImage.startsWith('http') || user.avatarImage.startsWith('file://'))
      return user.avatarImage;
    return `http://172.28.40.165:5000${user.avatarImage}?t=${Date.now()}`;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log off?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${BACK_SOCKET_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${user.token}`,
                'Content-Type': 'application/json',
              },
            });
          } catch (e) { console.log('logout api failed', e); }
          onLogout();
        },
      },
    ]);
  };

  const handleProfileUpdate = (updatedUser) => setUser(updatedUser);

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':     return <AdminDashboard userData={userData} />;
      case 'control':       return <ControlPage    userData={userData} />;
      case 'notifications': return <NotificationsPage userData={userData} onUnreadCountChange={setUnreadCount} />;
      case 'reports':       return <ReportsPage    userData={userData} />;
      case 'users':         return <UsersPage      userData={userData} />;
      case 'settings':      return <AdminSettings  currentUser={user} onLogout={onLogout} onProfileUpdate={handleProfileUpdate} />;
      default:              return <AdminDashboard userData={userData} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.appHeader}>
        <View style={styles.userInfoHeader}>
          <View style={styles.userAvatarHeader}>
            {getAvatarUrl() ? (
              <RNImage source={{ uri: getAvatarUrl() }} style={styles.userAvatarImage} />
            ) : (
              <View style={[styles.userAvatarHeader, { backgroundColor: user?.avatarColor || '#8B5CF6' }]}>
                <Text style={styles.userAvatarText}>
                  {user?.firstName && user?.lastName
                    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
                    : 'A'}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.userNameHeader}>
              {userData?.firstName && userData?.lastName
                ? `${userData.firstName} ${userData.lastName}` : 'Admin'}
            </Text>
            <Text style={styles.userRoleHeader}>
              {userData?.role?.toLowerCase() === 'admin' ? 'Admin' : 'Staff'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Page content */}
      <View style={styles.content}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {renderPage()}
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomNav}>

          <TouchableOpacity
            style={[styles.navItem, activePage === 'dashboard' && styles.navItemActive]}
            onPress={() => setActivePage('dashboard')}
          >
            <LayoutDashboard size={22} color={activePage === 'dashboard' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.navLabel, activePage === 'dashboard' && styles.navLabelActive]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activePage === 'control' && styles.navItemActive]}
            onPress={() => setActivePage('control')}
          >
            <SlidersHorizontal size={22} color={activePage === 'control' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.navLabel, activePage === 'control' && styles.navLabelActive]}>IoT Control</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activePage === 'settings' && styles.navItemActive]}
            onPress={() => setActivePage('settings')}
          >
            <Settings size={22} color={activePage === 'settings' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.navLabel, activePage === 'settings' && styles.navLabelActive]}>Settings</Text>
          </TouchableOpacity>

          {/* Notifications avec badge */}
          <TouchableOpacity
            style={[styles.navItem, activePage === 'notifications' && styles.navItemActive]}
            onPress={() => setActivePage('notifications')}
          >
            <View style={{ position: 'relative' }}>
              <Bell size={22} color={activePage === 'notifications' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navLabel, activePage === 'notifications' && styles.navLabelActive]}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activePage === 'reports' && styles.navItemActive]}
            onPress={() => setActivePage('reports')}
          >
            <BarChart3 size={22} color={activePage === 'reports' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.navLabel, activePage === 'reports' && styles.navLabelActive]}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activePage === 'users' && styles.navItemActive]}
            onPress={() => setActivePage('users')}
          >
            <Users size={22} color={activePage === 'users' ? '#8B5CF6' : '#6B7280'} strokeWidth={2} />
            <Text style={[styles.navLabel, activePage === 'users' && styles.navLabelActive]}>Users</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F7FC' },
  appHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 30, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  userInfoHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatarImage:    { width: 48, height: 48, borderRadius: 24 },
  userAvatarHeader:   { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  userAvatarText:     { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  userNameHeader:     { fontSize: 15, fontWeight: '600', color: '#111827' },
  userRoleHeader:     { fontSize: 13, color: '#6B7280' },
  logoutBtn:          { width: 40, height: 40, backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  content:            { flex: 1 },
  bottomNavContainer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  bottomNav:          { flexDirection: 'row', paddingBottom: Platform.OS === 'android' ? 38 : 8 },
  navItem:            { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, minWidth: 90, marginHorizontal: 4 },
  navItemActive:      { backgroundColor: '#DDD6FE' },
  navLabel:           { fontSize: 12, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  navLabelActive:     { color: '#8B5CF6', fontWeight: '600' },
  badge:              { position: 'absolute', top: -6, right: -10, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  badgeText:          { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});

export default MainApp;