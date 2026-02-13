import { Stack } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() => {
    // ✅ Écouter les deep links globalement
    const handleDeepLink = ({ url }) => {
      console.log('🌐 Deep link reçu dans _layout:', url);
    };

    // Vérifier l'URL initiale
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🌐 Initial URL dans _layout:', url);
      }
    });

    // Écouter les nouveaux liens
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  return (
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
      <Stack.Screen name="admin" options={{
          headerShown: false,
        }} />
      <Stack.Screen name="officier" options={{
          headerShown: false,
        }}/>
    </Stack>
  );
}