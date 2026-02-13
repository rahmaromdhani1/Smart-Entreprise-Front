import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import authService from '../Service/authService';

const ResetPassword = ({ route, navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [token, setToken] = useState('');
  
  // ✅ Prevent multiple verifications
  const hasVerified = useRef(false);

  useEffect(() => {
    // ✅ Only verify once
    if (route.params?.token && !hasVerified.current) {
      const receivedToken = route.params.token;
      setToken(receivedToken);
      console.log('✅ Token received in ResetPassword component:', receivedToken);
      
      // Mark as verified before calling API
      hasVerified.current = true;
      
      // Verify the token is valid
      verifyToken(receivedToken);
    } else if (!route.params?.token) {
      console.error('❌ No token found in route params');
      setVerifying(false);
      Alert.alert('Error', 'No token found. Please use the reset link from your email.');
    }
  }, [route.params?.token]); // ✅ Only depend on token

  const verifyToken = async (receivedToken) => {
    try {
      console.log('🔍 Verifying token...');
      const result = await authService.verifyResetToken(receivedToken);
      
      if (result.success) {
        console.log('✅ Token is valid');
        setTokenValid(true);
      } else {
        console.log('❌ Invalid token:', result.message);
        setTokenValid(false);
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Error verifying token:', error);
      setTokenValid(false);
      Alert.alert('Error', 'Unable to verify link. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = async () => {
    // Validations
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Sending password reset...');
      const result = await authService.resetPassword(token, newPassword, confirmPassword);

      if (result.success) {
        console.log('✅ Password reset successfully');
        Alert.alert(
          'Success! ',
          'Your password has been reset. Please login with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                if (navigation.reset) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } else if (navigation.navigate) {
                  navigation.navigate('Login');
                }
              }
            }
          ]
        );
      } else {
        console.log('❌ Error:', result.message);
        Alert.alert('Error', result.message || 'Error resetting password');
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (navigation.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } else if (navigation.navigate) {
      navigation.navigate('Login');
    }
  };

  // Rest of the component remains the same...
  if (verifying) {
    return (
      <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Verifying link...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!tokenValid) {
    return (
      <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Invalid Link</Text>
            <Text style={styles.errorMessage}>
              This link has expired or is invalid. Please request a new password reset link.
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBackToLogin}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Back to Login</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ========== RESET FORM ==========
  return (
    <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.box}>
            <View style={styles.header}>
              <Text style={styles.icon}>🔐</Text>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your new password</Text>
            </View>

            <View style={styles.form}>
              {/* New Password */}
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Match Check */}
              {newPassword && confirmPassword && (
                <View style={[
                  styles.checkBox,
                  newPassword === confirmPassword ? styles.checkBoxSuccess : styles.checkBoxError
                ]}>
                  <Text style={[
                    styles.checkBoxText,
                    newPassword === confirmPassword ? styles.checkBoxTextSuccess : styles.checkBoxTextError
                  ]}>
                    {newPassword === confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </Text>
                </View>
              )}

              {/* Reset Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleReset}
                disabled={loading || newPassword !== confirmPassword || !newPassword || !confirmPassword}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.button,
                    (loading || newPassword !== confirmPassword || !newPassword || !confirmPassword) && styles.buttonDisabled
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                onPress={handleBackToLogin}
                style={styles.backButton}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>← Back to Login</Text>
              </TouchableOpacity>
            </View>

            {/* Password Criteria */}
            <View style={styles.criteria}>
              <Text style={styles.criteriaTitle}>Password criteria:</Text>
              <Text style={[styles.criteriaItem, newPassword.length >= 8 && styles.criteriaItemMet]}>
                {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
              </Text>
              <Text style={[styles.criteriaItem, newPassword === confirmPassword && newPassword && styles.criteriaItemMet]}>
                {newPassword === confirmPassword && newPassword ? '✓' : '○'} Passwords match
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 60,
    elevation: 12,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  box: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 60,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    fontSize: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
    fontWeight: '500',
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 20,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    paddingRight: 50,
    fontSize: 14,
    color: '#111827',
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  checkBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  checkBoxSuccess: {
    backgroundColor: '#e8f5e9',
    borderLeftColor: '#4caf50',
  },
  checkBoxError: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#f44336',
  },
  checkBoxText: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkBoxTextSuccess: {
    color: '#2e7d32',
  },
  checkBoxTextError: {
    color: '#c62828',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  criteria: {
    backgroundColor: '#f9f7fc',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  criteriaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  criteriaItem: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 5,
  },
  criteriaItemMet: {
    color: '#4caf50',
    fontWeight: '600',
  },
});

export default ResetPassword;