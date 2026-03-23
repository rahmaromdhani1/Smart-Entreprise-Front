// MainApp.jsx
import React, { useState } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform,Image as RNImage } from 'react-native';
import DashboardPage from './Dashboard';
import ControlPage from './Control';
import NotificationsPage from './Notification';
import SettingsPage from './settings';
import {
  LayoutDashboard,
  SlidersHorizontal,
  Settings,
  Bell,
  BarChart3,
  Users,
  LogOut
} from "lucide-react-native";

const MainApp = ({ userData, onLogout }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState(userData);
  useEffect(() => {
    setUser(userData); // mettre à jour l'utilisateur si userData change
    }, [userData]);
    
  const getAvatarUrl = () => {
  if (!user?.avatarImage) return null; // pas d'image → retourne null
  if (user.avatarImage.startsWith("http") || user.avatarImage.startsWith("file://")) {
    return user.avatarImage; // lien complet → on le garde
  }
  // chemin relatif depuis ton backend → on ajoute l'IP et un timestamp pour éviter le cache
  return `http://172.28.40.165:5000${user.avatarImage}?t=${Date.now()}`;
};
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage userData={userData} />;
      case 'control':
        return <ControlPage userData={userData} />;
      case 'notifications':
        return <NotificationsPage userData={userData} />;
      case 'settings':
        return <SettingsPage currentUser={user} onLogout={onLogout} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardPage userData={userData} />;
    }
  };
const handleProfileUpdate = (updatedUser) => {
  setUser(updatedUser); // met à jour le header
};
  return (
    <View style={styles.container}>
      {/* Header avec info utilisateur */}
      <View style={styles.appHeader}>
        <View style={styles.userInfoHeader}>
          <View style={styles.userAvatarHeader}>
          {getAvatarUrl() ? (
            <RNImage
              source={{ uri: getAvatarUrl() }}
              style={styles.userAvatarImage}
            />
          ) : (
            <View
              style={[styles.userAvatarHeader, { backgroundColor: user.avatarColor || "#8B5CF6" }]}
            >
              <Text style={styles.userAvatarText}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
                  : "A"}
              </Text>
            </View>
          )}
         </View>
          <View>
            <Text style={styles.userNameHeader}>
              {userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}`: 'Admin'}
            </Text>
             <Text style={styles.userRoleHeader}>
                {userData?.role?.toLowerCase() === 'admin' ? 'Admin' : 'Staff'}
              </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <LogOut size={20} color="#EF4444" />

        </TouchableOpacity>
      </View>

      {/* Contenu de la page active */}
      <View style={styles.content}>{renderPage()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navItem,
            activePage === 'dashboard' && styles.navItemActive,
          ]}
          onPress={() => setActivePage('dashboard')}
        >
          <LayoutDashboard
  size={22}
  color={activePage === 'dashboard' ? "#8B5CF6" : "#6B7280"}
  strokeWidth={2}
/>

          <Text
            style={[
              styles.navLabel,
              activePage === 'dashboard' && styles.navLabelActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem,
            activePage === 'control' && styles.navItemActive,
          ]}
          onPress={() => setActivePage('control')}
        >
          <SlidersHorizontal
  size={22}
  color={activePage === 'control' ? "#8B5CF6" : "#6B7280"}
  strokeWidth={2}
/>

          <Text
            style={[
              styles.navLabel,
              activePage === 'control' && styles.navLabelActive,
            ]}
          >
            Contrôle IoT
          </Text>
        </TouchableOpacity>
<TouchableOpacity
          style={[
            styles.navItem,
            activePage === 'settings' && styles.navItemActive,
          ]}
          onPress={() => setActivePage('settings')}
        >
         <Settings
  size={22}
  color={activePage === 'settings' ? "#8B5CF6" : "#6B7280"}
  strokeWidth={2}
/>

          <Text
            style={[
              styles.navLabel,
              activePage === 'settings' && styles.navLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            activePage === 'notifications' && styles.navItemActive,
          ]}
          onPress={() => setActivePage('notifications')}
        >
          <Bell
  size={22}
  color={activePage === 'notifications' ? "#8B5CF6" : "#6B7280"}
  strokeWidth={2}
/>

          <Text
            style={[
              styles.navLabel,
              activePage === 'notifications' && styles.navLabelActive,
            ]}
          >
            Notifications
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },

  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 15,
    paddingTop:30,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarHeader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userNameHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userRoleHeader: {
    fontSize: 13,
    color: '#6B7280',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    fontSize: 20,
  },

  // === CONTENT ===
  content: {
    flex: 1,
  },

  // === BOTTOM NAVIGATION ===
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'android'? 38:8 ,
    paddingHorizontal: 8,
    paddingTop : 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    transition: 'all 0.3s ease',
  },
  navItemActive: {
    backgroundColor: '#DDD6FE', // --active-bg
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navIconActive: {
    transform: [{ scale: 1.1 }],
  },
  userAvatarImage: {
  width: 48,
  height: 48,
  borderRadius: 24,
},

  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280', // --text-body
  },
  navLabelActive: {
    color: '#8B5CF6', // --primary
    fontWeight: '600',
  },
});

export default MainApp;