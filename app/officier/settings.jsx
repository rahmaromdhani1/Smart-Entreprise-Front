// src/pages/admin/AdminSettings.jsx - Version React Native Mobile avec AsyncStorage
import React, { useState, useEffect } from "react";
import {
  User,
  Lock,
  Upload,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react-native";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { updateProfile, updatePassword, saveUser, getUser } from "../../Service/userservice";

const SettingsPage = ({ currentUser, onLogout, onProfileUpdate }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit modal states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarColor, setAvatarColor] = useState("#8B5CF6");
  const [avatarImage, setAvatarImage] = useState(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fullName =
    currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : "Admin";

  const [userAvatar] = useState(
    currentUser?.firstName ? currentUser.firstName.charAt(0).toUpperCase() : "A"
  );

  // Avatar storage
  const [avatarFile, setAvatarFile] = useState(null);

  // ✅ Sync local state when currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      // ✅ Synchroniser email et phone avec currentUser
      const userEmail = currentUser.mail || currentUser.email || "";
      const userPhone = currentUser.phone || "";

      setEmail(userEmail);
      setPhone(userPhone);
      setAvatarColor(currentUser.avatarColor || "#8B5CF6");

      // ✅ Add cache-busting timestamp to force image reload
      const imageUrl = currentUser.avatarImage
        ? `${currentUser.avatarImage}?t=${Date.now()}`
        : null;
      setAvatarImage(imageUrl);
    }
  }, [currentUser]);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation (Tunisia format)
  const validatePhone = (phone) => {
    const phoneRegex = /^\d{8}$/;
    return phoneRegex.test(phone.trim());
  };

  // Password strength checker
  const checkPasswordStrength = (pwd) => {
    if (pwd.length < 6) return "weak";
    if (pwd.length < 8) return "medium";

    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(
      Boolean
    ).length;

    if (strength >= 3 && pwd.length >= 10) return "strong";
    if (strength >= 2 && pwd.length >= 8) return "medium";
    return "weak";
  };

  // Handle password input
  const handlePasswordChange = (pwd) => {
    setPassword(pwd);
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  // Handle image upload for mobile
  const handleImageUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photo library");
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ Store file info (for backend upload)
        setAvatarFile({
          uri: asset.uri,
          type: "image/jpeg",
          name: `avatar_${Date.now()}.jpg`,
        });

        // ✅ Preview image
        setAvatarImage(asset.uri);
        setError("");
      }
    } catch (err) {
      console.error("Image picker error:", err);
      setError("Failed to pick image");
    }
  };

  // Save profile changes with API call
  const handleSaveChanges = async () => {
    console.log("🟢 handleSaveChanges called");

    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid phone number (8 digits)");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("avatarColor", avatarColor);

      // ✅ If there's a file, upload it
      if (avatarFile) {
        console.log("🟢 Adding file:", avatarFile.name);
        formData.append("avatar", avatarFile);
      }
      // ✅ If there's no file AND no current image, we're removing the avatar
      else if (!avatarImage || !currentUser?.avatarImage) {
        console.log("🟢 No image - removing avatar, using color only");
        formData.append("removeAvatar", "true");
      }

      console.log("🟢 Calling updateProfile API...");
      const response = await updateProfile(formData);

      console.log("✅ API Response:", response);

      // ✅ CRITICAL: Preserve the current token when updating
      const updatedUserData = {
        ...response.user,
        token: currentUser.token,
      };

      console.log("🟢 Updated user data with token:", updatedUserData);

      // ✅ Save updated user to AsyncStorage
      await saveUser(updatedUserData);
      console.log("✅ User saved to AsyncStorage");

      // ✅ Update parent component
      if (onProfileUpdate) {
        console.log("🟢 Calling onProfileUpdate...");
        onProfileUpdate(updatedUserData);
      }

      // ✅ Clear the file input after successful upload
      setAvatarFile(null);

      console.log("✅ Profile saved successfully");
      showSuccess(response.message || "Profile updated successfully");
      setShowEditModal(false);
    } catch (err) {
      console.error("❌ Save error:", err);
      if (err.response) {
        setError(err.response.data.message || "Failed to update profile");
      } else {
        setError(err.message || "Failed to update profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password with API call
  const handleResetPassword = async () => {
    console.log("🟢 handleResetPassword called");
    
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }

    if (password.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (passwordStrength === "weak") {
      setError("Please choose a stronger password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("🟢 Calling updatePassword API...");
      const response = await updatePassword(currentPassword, password);

      console.log("✅ Password update response:", response);

      showSuccess(response.message || "Password updated successfully");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength("");
      setShowResetPassword(false);
    } catch (err) {
      console.error("❌ Password update error:", err);
      if (err.response) {
        setError(err.response.data.message || "Failed to update password");
      } else {
        setError(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper function to get avatar display URL with cache-busting
  const getAvatarDisplayUrl = () => {
    if (!avatarImage) return null;

    // If it's a local URI (from image picker), return as-is
    if (avatarImage.startsWith("file://")) {
      return avatarImage;
    }

    // Otherwise, ensure proper URL format with cache-busting
    const baseUrl = avatarImage.startsWith("http")
      ? avatarImage
      : `http://172.28.40.165:3000${avatarImage}`;

    return `${baseUrl.split("?")[0]}?t=${Date.now()}`;
  };

  // Color options for avatar
  const colorOptions = [
    "#8B5CF6",
    "#EF4444",
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EC4899",
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F7FC' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'flex-start',
          paddingTop: 20,
          paddingBottom: 60,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Manage your profile and preferences</Text>
        </View>

        {/* Error Display */}
        {error ? (
          <View style={styles.errorMessage}>
            <AlertCircle size={20} color="#F59E0B" strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Success Display */}
        {success ? (
          <View style={styles.successMessage}>
            <CheckCircle size={20} color="#10B981" strokeWidth={2} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {/* Profile Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardBorder}
          />
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {avatarImage ? (
                <Image
                  source={{ uri: getAvatarDisplayUrl() }}
                  style={styles.avatarLarge}
                />
              ) : (
                <View
                  style={[
                    styles.avatarLarge,
                    { backgroundColor: avatarColor },
                  ]}
                >
                  <Text style={styles.avatarText}>{userAvatar}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editIcon}
                onPress={() => setShowEditModal(true)}
              >
                <Feather name="edit-2" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{currentUser?.role || "ADMIN"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardBorder}
          />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <View style={[styles.iconContainer, styles.iconPrimary]}>
  <User size={20} color="#8B5CF6" strokeWidth={2} />
</View>

          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.inputReadOnly}
              value={fullName}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.inputReadOnly}
              value={email}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.inputReadOnly}
              value={phone}
              editable={false}
            />
          </View>
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardBorder}
          />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Security</Text>
            <View style={[styles.iconContainer, styles.iconWarning]}>
  <Lock size={20} color="#F59E0B" strokeWidth={2} />
</View>

          </View>

          {!showResetPassword ? (
            <TouchableOpacity
              style={styles.resetPasswordBtn}
              onPress={() => setShowResetPassword(true)}
            >
              <Lock size={20} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.resetPasswordText}>Reset Password</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.field}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
  style={styles.input}
  value={currentPassword}
  onChangeText={setCurrentPassword}
  placeholder="Enter current password"
  secureTextEntry={!showCurrentPassword}
/>

                <TouchableOpacity
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={styles.eyeButton}
                                  >
                                    <Feather
                                      name={showCurrentPassword ? 'eye' : 'eye-off'}
                                      size={20}
                                      color="#6B7280"
                                    />
                                  </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 16 }}>
                <View style={{ position: 'relative' }}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="Min. 8 characters"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 35, // fixe l’icon verticalement au centre du champ
                      padding: 5,
                    }}
                  >
                    <Feather
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              
                {password ? (
                  <View
                    style={[
                      styles.passwordStrength,
                      styles[`strength_${passwordStrength}`],
                    ]}
                  >
                    <Text style={styles.strengthText}>
                      Strength: <Text style={styles.strengthValue}>{passwordStrength}</Text>
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
  style={styles.input}
  value={confirmPassword}
  onChangeText={setConfirmPassword}
  placeholder="Confirm new password"
  secureTextEntry={!showConfirmPassword}
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

              <View style={styles.passwordButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelBtn]}
                  onPress={() => {
                    setShowResetPassword(false);
                    setCurrentPassword("");
                    setPassword("");
                    setConfirmPassword("");
                    setPasswordStrength("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.updateBtn]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !loading && setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => !loading && setShowEditModal(false)}
              >
                <X size={24} color="#6B7280" strokeWidth={2} />

              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Avatar Section */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Avatar</Text>

                {/* Avatar Preview */}
                <View style={styles.avatarPreviewContainer}>
                  {avatarImage ? (
                    <Image
                      source={{ uri: getAvatarDisplayUrl() }}
                      style={styles.avatarPreview}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPreview,
                        { backgroundColor: avatarColor },
                      ]}
                    >
                      <Text style={styles.avatarPreviewText}>{userAvatar}</Text>
                    </View>
                  )}
                </View>

                {/* Color Picker */}
                <View style={styles.field}>
                  <Text style={styles.label}>Avatar Color</Text>
                  <View style={styles.colorPicker}>
                    {colorOptions.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          avatarColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                          setAvatarColor(color);
                          setAvatarImage(null);
                          setAvatarFile(null);
                        }}
                        disabled={loading}
                      />
                    ))}
                  </View>
                </View>

                {/* Image Upload */}
                <View style={styles.field}>
                  <Text style={styles.label}>Or Upload Image</Text>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handleImageUpload}
                    disabled={loading}
                  >
                    <Upload size={20} color="#fff" strokeWidth={2} />

                    <Text style={styles.uploadBtnText}>Choose Image</Text>
                  </TouchableOpacity>
                  {avatarImage && (
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setAvatarImage(null);
                        setAvatarFile(null);
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.removeImageText}>Remove Image</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Contact Information */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@domain.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+216 XX XXX XXX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelBtn]}
                onPress={() => setShowEditModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveBtn]}
                onPress={handleSaveChanges}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 32,
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
  errorMessage: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    color: '#92400E',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  successMessage: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#f65cf1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
  },
  editIcon: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#F8F7FC',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrimary: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  iconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  iconText: {
    fontSize: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputReadOnly: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  passwordStrength: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  strength_weak: {
    backgroundColor: '#FEE2E2',
  },
  strength_medium: {
    backgroundColor: '#FEF3C7',
  },
  strength_strong: {
    backgroundColor: '#D1FAE5',
  },
  strengthText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  strengthValue: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  updateBtn: {
    backgroundColor: '#8B5CF6',
  },
  saveBtn: {
    backgroundColor: '#8B5CF6',
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  resetPasswordBtn: {
    backgroundColor: '#8B5CF6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  resetPasswordText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPreviewText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '700',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#111827',
  },
  uploadBtn: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeImageBtn: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
   eyeButton: {
  position: 'absolute',
  right: 10,
  top: '60%',
  transform: [{ translateY: -10 }],
  padding: 5,
},
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default SettingsPage