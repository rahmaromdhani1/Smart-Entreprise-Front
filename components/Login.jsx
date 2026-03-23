import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import authService from '../Service/authService';
import storageService from '../Service/storageService';
import { UserCog, User, Eye, EyeOff, X, Mail } from 'lucide-react-native';

const Login = ({ onLogin }) => {
  const [usermail, setUsermail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // États pour le modal de réinitialisation
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const float1 = useRef(new Animated.Value(40)).current;
  const float2 = useRef(new Animated.Value(40)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const scrollRef = useRef(null);

  const handleSubmit = async () => {
    if (!usermail.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usermail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(usermail, password, role);
      console.log('📝 Login API result:', result);

      if (result.success) {
        const user = {
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          phone: result.data.phone,
          mail: result.data.mail,
          role: result.data.role,
          token: result.data.token,
          avatarImage: result.data.avatarImage, // ✅ URL complète
  avatarColor: result.data.avatarColor,
        };

        await storageService.saveUserData(user);
        onLogin(user);

      } else {
        Alert.alert('Connection error', result.message);
      }

    } catch (error) {
      Alert.alert('Error', 'An unexpected error has occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setResetLoading(true);

    try {
      const result = await authService.forgotPassword(resetEmail);
      Alert.alert(
        'Password Reset',
        result.message || 'If this email exists, a reset link has been sent.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPasswordModal(false);
              setResetEmail('');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Forgot password error:', error);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: 120, duration: 8000, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, { toValue: 0, duration: 8000, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 120, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.container}>
      <Animated.View style={[styles.circle1, { transform: [{ translateY: float1 }] }]} />
      <Animated.View style={[styles.circle2, { transform: [{ translateY: float2 }] }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.loginBox, { transform: [{ translateY: slideUp }] }]}>
              <View style={styles.logo}>
                <Text style={styles.logoTitle}>SEMS</Text>
                <Text style={styles.logoSubtitle}>Smart Enterprise Management System</Text>
              </View>

              <View style={styles.roleSelector}>
                <TouchableOpacity onPress={() => setRole('admin')} activeOpacity={0.9}>
                  {role === 'admin' ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.roleCard, styles.activeRoleCard]}
                    >
                      <UserCog size={28} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16 }}>Admin</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.roleCard}>
                      <UserCog size={28} color="#8B5CF6" />
                      <Text style={styles.roleText}>Admin</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setRole('staff')} activeOpacity={0.9}>
                  {role === 'staff' ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.roleCard, styles.activeRoleCard]}
                    >
                      <User size={28} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16 }}>Staff</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.roleCard}>
                      <User size={28} color="#8B5CF6" />
                      <Text style={styles.roleText}>Staff</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Entrez votre mail"
                  placeholderTextColor="#6B7280"
                  value={usermail}
                  onChangeText={setUsermail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => {
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  autoCorrect={false}
                  editable={!loading}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••••••"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <Eye size={20} color="#6B7280" />
                    ) : (
                      <EyeOff size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowForgotPasswordModal(true)}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.button, styles.activeRoleCard]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Modal de réinitialisation de mot de passe */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'android' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <TouchableWithoutFeedback onPress={() => setShowForgotPasswordModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Reset Password</Text>
                    <TouchableOpacity
                      onPress={() => setShowForgotPasswordModal(false)}
                      style={styles.closeButton}
                    >
                      <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDescription}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <Mail size={20} color="#8B5CF6" style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#6B7280"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!resetLoading}
                    />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleForgotPassword}
                    disabled={resetLoading}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalButton}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalButtonText}>Send Reset Link</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  circle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    top: -200,
    right: -200,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    bottom: -150,
    left: -150,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loginBox: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 60,
    elevation: 12,
    zIndex: 1,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  roleCard: {
    width: 110,
    paddingVertical: 24,
    backgroundColor: '#F8F7FC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRoleCard: {
    backgroundColor: '#8B5CF6',
    transform: [{ translateY: -2 }],
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 6,
  },
  roleText: {
    fontSize: 16,
    color: '#111827',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    fontSize: 14,
    color: '#111827',
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
    right: 14,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Styles du modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    padding: 14,
    fontSize: 14,
    color: '#111827',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 15,
    elevation: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Login;