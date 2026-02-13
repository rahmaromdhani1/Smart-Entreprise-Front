// NotificationsPage.jsx
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell
} from "lucide-react-native";

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { io } from "socket.io-client";

const socket = io("http://172.28.40.165:5000");

const NotificationsPage = ({ userData }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  useEffect(() => {
    fetch("http://172.28.40.165:5000/api/alerts")
      .then(res => res.json())
      .then(data => {
        console.log("Received data:", data); // Pour debug
        
        // Vérifier que data est bien un tableau
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
          console.error("Data is not an array:", data);
          setNotifications([]);
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setNotifications([]);
      })
      .finally(() => {
        setLoading(false);
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

      setNotifications(prev => [mapped, ...(prev || [])]);
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
                  {getIcon(notification.type, notifStyle.iconColor)}
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Bell size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see alerts and updates here
            </Text>
          </View>
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
  pageHeader: {
    marginBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pageSubtitle: {
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
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
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
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default NotificationsPage;