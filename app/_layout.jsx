import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { BackMSocketProvider } from '../hook/useBackMSocket';
import { SocketProvider } from '../context/SocketContext';

export default function Layout() {
  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      console.log('🌐 Deep link reçu dans _layout:', url);
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🌐 Initial URL dans _layout:', url);
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  return (
    <SocketProvider>
      <BackMSocketProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="reset-password"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="admin"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="officier"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </BackMSocketProvider>
    </SocketProvider>
  );
}