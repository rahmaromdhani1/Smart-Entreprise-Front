import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendHeartbeat, markOffline } from '../Service/users';
import { updateSocketAuth } from '../context/SocketContext';


const noop = () => {};

// ─── Constante API ───────────────────────────────────────────
const API_URL = process.env.EXPO_PUBLIC_API_URL; // ← variable Expo (pas NEXT_PUBLIC)

// ─── Contexte ────────────────────────────────────────────────
const AuthContext = createContext({
  isAuthenticated: false,
  currentUser: null,
  isValidating: true,
  handleLogin: noop,
  handleLogout: noop,
  handleProfileUpdate: noop,
});

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser,     setCurrentUser]     = useState(null);
  const [isValidating,    setIsValidating]    = useState(true);

  const heartbeatRef = useRef(null);

  // ── Heartbeat ──────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 30_000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Validation session (AsyncStorage) ─────────────────────
  useEffect(() => {
    const validateSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');

        if (!storedUser) {
          setIsValidating(false);
          const publicRoutes = ['/login', '/forgot-password', '/reset-password'];
          if (!publicRoutes.includes(pathname)) {
            router.replace('/login');
          }
          return;
        }

        const user = JSON.parse(storedUser);

        if (!user?.token) {
          await _logout();
          return;
        }

        const res = await fetch(
          `${API_URL}/api/auth/profile/${user.id}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        if (res.ok) {
          try {
            const profileData = await res.json();
            const freshUser = {
              ...user,
              ...(profileData.user ?? profileData.data ?? profileData),
              token: user.token,
              role: (
                profileData.user?.role ??
                profileData.role ??
                user.role
              ).toLowerCase(),
            };
            setCurrentUser(freshUser);
            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
          } catch {
            // JSON parse failed — on garde l'utilisateur stocké
            setCurrentUser(user);
          }

          setIsAuthenticated(true);
          startHeartbeat();
        } else {
          await _logout();
        }
      } catch (err) {
        console.error('[AuthContext] validateSession error :', err);
        await _logout();
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [pathname]);

  // ── Logout interne (sans redirection) ─────────────────────
  const _logout = useCallback(async () => {
    stopHeartbeat();
    try { await markOffline(); } catch { /* ignore */ }
    setIsAuthenticated(false);
    setCurrentUser(null);
    await AsyncStorage.removeItem('user');
  }, [stopHeartbeat]);

  // ── Actions exposées ───────────────────────────────────────
  const handleLogin = useCallback(async (userData) => {
    const user = { ...userData, role: userData.role.toLowerCase() };
    updateSocketAuth(user.token, {
    functionalGrade: user.functionalGrade,
    officeRoom: user.officeRoom,
    floor: user.floor,
    additionalAccess: user.additionalAccess,
  });
    setCurrentUser(user);
    setIsAuthenticated(true);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    startHeartbeat();
    router.replace(user.role === 'admin' ? '/admin' : '/staff');
  }, [startHeartbeat, router]);

  const handleLogout = useCallback(async () => {
    await _logout();
    router.replace('/login');
  }, [_logout, router]);

  const handleProfileUpdate = useCallback(async (updatedUser) => {
    const merged = {
      ...currentUser,
      ...updatedUser,
      token: updatedUser.token || currentUser?.token,
      role: (updatedUser.role || currentUser?.role).toLowerCase(),
    };
    setCurrentUser(merged);
    await AsyncStorage.setItem('user', JSON.stringify(merged));
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      isValidating,
      handleLogin,
      handleLogout,
      handleProfileUpdate,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook consommateur ────────────────────────────────────────
export function useAuthContext() {
  return useContext(AuthContext);
}