import React, { useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ResetPassword from '../components/ResetPassword';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const hasRendered = useRef(false); // ✅ Prevent multiple renders
  
  // ✅ Only log once
  if (!hasRendered.current) {
    console.log('📱 Reset Password Screen - Token reçu:', token);
    hasRendered.current = true;
  }

  const navigation = {
    navigate: (screen) => {
      if (screen === 'Login') {
        router.replace('/');
      }
    },
    reset: ({ routes }) => {
      if (routes[0]?.name === 'Login') {
        router.replace('/');
      }
    },
  };

  // ✅ Don't render if no token
  if (!token) {
    router.replace('/');
    return null;
  }

  return (
    <ResetPassword 
      route={{ params: { token } }} 
      navigation={navigation}
    />
  );
}