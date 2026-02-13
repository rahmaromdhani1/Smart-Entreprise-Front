import React, { useEffect, useState, useRef } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell
} from "lucide-react-native";

import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { io } from "socket.io-client";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const socket = io("http://172.28.40.165:5000");

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

Notifications.addNotificationReceivedListener(notification => {
  Alert.alert(notification.request.content.title, notification.request.content.body);
});

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  // Fonction pour demander les permissions et obtenir le token
  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Vous devez autoriser les notifications pour recevoir des alertes.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } else {
      Alert.alert('Erreur', 'Les notifications push ne fonctionnent que sur un appareil physique');
    }

    return token;
  }

  // Fonction pour envoyer une notification locale
  async function sendLocalNotification(alert) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.type ? alert.type.toUpperCase() : "ALERT",
        body: alert.message,
        data: { alertId: alert._id, level: alert.level },
        sound: true,
        priority:
           Notifications.AndroidNotificationPriority.MAX 
          
      },
      trigger: null, // Envoie immédiatement
    });
  }


 

 useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log(notification);
  });

  return () => subscription.remove(); 
}, []);

  useEffect(() => {
    fetch("http://172.28.40.165:5000/api/alerts")
      .then(res => res.json())
      .then(data => {
        console.log("Data received:", data);
        
        if (Array.isArray(data)) {
          const mapped = data.map(alert => ({
            _id: alert._id,
            type: alert.level,
            title: alert.type ? alert.type.toUpperCase() : "ALERT",
            message: alert.message,
            time: formatTime(alert.createdAt),
          }));
          setNotifications(mapped);
        } else {
          console.error("Data is not an array");
          setNotifications([]);
        }
      })
      .catch(err => {
        console.error(err);
        setNotifications([]);
      });
  }, []);

  useEffect(() => {
    socket.on("new-alert", (alert) => {
      const mapped = {
        _id: alert._id,
        type: alert.level,
        title: alert.type ? alert.type.toUpperCase() : "ALERT",
        message: alert.message,
        time: formatTime(alert.createdAt),
      };

      setNotifications(prev => [mapped, ...prev]);
      
      // Envoyer une notification push locale
      sendLocalNotification(alert);
    });

    return () => socket.off("new-alert");
  }, []);

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'critical':
        return {
          borderColor: '#EF4444',
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: '#EF4444',
        };
      case 'warning':
        return {
          borderColor: '#F59E0B',
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: '#F59E0B',
        };
      case 'info':
        return {
          borderColor: '#8B5CF6',
          iconBg: 'rgba(139, 92, 246, 0.1)',
          iconColor: '#8B5CF6',
        };
      default:
        return {
          borderColor: '#E5E7EB',
          iconBg: '#F8F7FC',
          iconColor: '#6B7280',
        };
    }
  };

  const getIcon = (level, color) => {
    switch (level) {
      case "critical":
        return <AlertCircle size={22} color={color} strokeWidth={2} />;
      case "warning":
        return <AlertTriangle size={22} color={color} strokeWidth={2} />;
      case "info":
        return <Info size={22} color={color} strokeWidth={2} />;
      default:
        return <Bell size={22} color={color} strokeWidth={2} />;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications & Alerts</Text>
        <Text style={styles.subtitle}>Stay informed in real time</Text>
      </View>

      {/* Notifications List */}
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
              <View
                key={notif._id || index}
                style={[
                  styles.notificationCard,
                  { borderLeftColor: notifStyle.borderColor },
                ]}
              >
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: notifStyle.iconBg },
                  ]}
                >
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  notificationsList: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 16,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});

export default NotificationsPage;