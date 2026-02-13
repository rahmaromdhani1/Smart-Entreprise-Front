import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Users, Crown, UserCheck, CheckCircle } from 'lucide-react-native';
import { getUsers, createUser, updateUser, deleteUser } from '../../Service/users';


const AdminUsers = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', phone: '' });
  const [functionalGrades, setFunctionalGrades] = useState([]);

  // Form data states
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'staff',
    functionalGrade: '',
  });

  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'staff',
    functionalGrade: '',
  });

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [toastAnimation] = useState(new Animated.Value(-100));

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Toast animation effect
  useEffect(() => {
    if (toast.show) {
      Animated.sequence([
        Animated.timing(toastAnimation, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(4000),
        Animated.timing(toastAnimation, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast({ show: false, type: '', message: '' });
      });
    }
  }, [toast.show]);

  /**
   * Toast notification handler
   */
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  /**
   * Generate a strong random password
   */
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  /**
   * Fetch all users from the API
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
      showToast('error', 'Failed to load users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle opening the add user modal
   */
  const handleAddUser = () => {
    const password = generatePassword();
    setGeneratedPassword(password);
    setPasswordCopied(false);
    setNewUserData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'staff',
      functionalGrade: '',
    });
    setShowAddModal(true);
  };

  /**
   * Handle form submission to create user
   */
  const handleSubmitNewUser = async () => {
  // Réinitialiser les erreurs
  setFieldErrors({ email: '', phone: '' });

  // Vérification des champs vides
  if (!newUserData.firstName.trim() || !newUserData.lastName.trim() || !newUserData.email.trim() || !newUserData.phone.trim()) {
    showToast('error', 'All fields are required!');
    return;
  }

  // Vérifier si l'email ou le téléphone existe déjà
  const emailExists = users.some(u => u.email.toLowerCase() === newUserData.email.trim().toLowerCase());
  const phoneExists = users.some(u => u.phone === newUserData.phone.trim());

  if (emailExists || phoneExists) {
    setFieldErrors({
      email: emailExists ? 'This email already exists' : '',
      phone: phoneExists ? 'This phone number already exists' : '',
    });
    return; // stoppe la création
  }

  // Création de l'utilisateur
  const userData = {
    firstName: newUserData.firstName.trim(),
    lastName: newUserData.lastName.trim(),
    email: newUserData.email.trim(),
    phone: newUserData.phone.trim(),
    password: generatedPassword,
    role: newUserData.role,
    functionalGrade: newUserData.role === 'staff' ? newUserData.functionalGrade.trim() : null,
  };

  try {
    const newUser = await createUser(userData);
    setUsers([...users, newUser]);
    setShowAddModal(false);
    showToast('success', `User ${newUser.name} created successfully!`);
  } catch (err) {
    console.error(err);
    showToast('error', 'Failed to create user: ' + (err.response?.data?.message || err.message));
  }
  if (newUserData.functionalGrade.trim()) {
  setFunctionalGrades(prev => {
    const grade = newUserData.functionalGrade.trim();
    return prev.includes(grade) ? prev : [...prev, grade];
  });
}

};


  /**
   * Copy password to clipboard
   */
  const copyPassword = async () => {
    await Clipboard.setStringAsync(generatedPassword);
    setPasswordCopied(true);
    showToast('success', 'Password copied to clipboard!');
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  /**
   * Handle editing an existing user
   */
  const handleEditUser = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      showToast('error', 'User not found');
      return;
    }

    const currentName = user.name.split(' ');
    const currentFirstName = currentName[0];
    const currentLastName = currentName.slice(1).join(' ');

    setUserToEdit(user);
    setEditUserData({
      firstName: currentFirstName,
      lastName: currentLastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      functionalGrade: user.functionalGrade || '',
    });
    setShowEditModal(true);
  };

  /**
   * Handle submitting edit user form
   */
  const handleSubmitEditUser = async () => {
    try {
      const updateData = {
        firstName: editUserData.firstName.trim(),
        lastName: editUserData.lastName.trim(),
        email: editUserData.email.trim(),
        role: editUserData.role.toLowerCase(),
      };

      if (editUserData.phone && editUserData.phone.trim()) {
        updateData.phone = editUserData.phone.trim();
      }

      if (editUserData.role.toLowerCase() === 'staff') {
        updateData.functionalGrade = editUserData.functionalGrade.trim();
      }

      // Call API to update user
      const updatedUser = await updateUser(userToEdit.id, updateData);

      // Update user in state
      setUsers(users.map((u) => (u.id === userToEdit.id ? updatedUser : u)));

      showToast('success', `User ${updatedUser.name} updated successfully!`);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating user:', err);
      showToast('error', 'Failed to update user: ' + (err.response?.data?.message || err.message));
    }
  };

  /**
   * Handle opening delete confirmation modal
   */
  const handleDeleteUserPrompt = (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      showToast('error', 'User not found');
      return;
    }
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  /**
   * Handle confirming user deletion
   */
  const handleConfirmDelete = async () => {
    try {
      // Call API to delete user
      await deleteUser(userToDelete.id);

      // Remove user from state
      setUsers(users.filter((user) => user.id !== userToDelete.id));

      showToast('success', 'User deleted successfully!');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('error', 'Failed to delete user: ' + (err.response?.data?.message || err.message));
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Toast Notification */}
      {toast.show && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnimation }] },
          ]}
        >
          <View
            style={[
              styles.toast,
              toast.type === 'error' && styles.toastError,
              toast.type === 'success' && styles.toastSuccess,
              toast.type === 'warning' && styles.toastWarning,
            ]}
          >
            <Text style={styles.toastIcon}>
              {toast.type === 'error' && '❌'}
              {toast.type === 'success' && '✅'}
              {toast.type === 'warning' && '⚠️'}
            </Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
            <TouchableOpacity onPress={() => setToast({ show: false, type: '', message: '' })}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>Manage system access and permissions</Text>
      </View>

      

      {/* Users Section */}
      <View style={styles.usersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>User List</Text>
          <TouchableOpacity onPress={handleAddUser} activeOpacity={0.8}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnAddFab}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No users found</Text>
            <TouchableOpacity onPress={handleAddUser} activeOpacity={0.8}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPrimary}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Add First User</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              {/* User Card Header */}
              <View style={styles.userCardHeader}>
                <View style={styles.userInfo}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.userAvatar}
                  >
                    <Text style={styles.userAvatarText}>{user.initials}</Text>
                  </LinearGradient>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: user.status === 'active' ? '#10B981' : '#6B7280' },
                  ]}
                />
              </View>

              {/* User Card Body */}
              <View style={styles.userCardBody}>
                <View style={styles.userMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Role</Text>
                    <View
                      style={[
                        styles.badge,
                        user.role === 'admin' ? styles.badgeAdmin : styles.badgeStaff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          user.role === 'admin' ? styles.badgeTextAdmin : styles.badgeTextStaff,
                        ]}
                      >
                        {user.role === 'admin' ? 'Administrator' : 'Staff'}
                      </Text>
                    </View>
                  </View>

                  {user.role === 'staff' && user.functionalGrade && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Grade</Text>
                      <Text style={styles.metaValue}>{user.functionalGrade}</Text>
                    </View>
                  )}

                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Last Login</Text>
                    <Text style={styles.metaValue}>{user.lastLogin}</Text>
                  </View>
                </View>

                {/* User Actions */}
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={styles.actionBtnEdit}
                    onPress={() => handleEditUser(user.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#8B5CF6" />
                    <Text style={styles.actionBtnEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteUserPrompt(user.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.actionBtnDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
{/* Stats Grid */}
      {/* Stats Grid */}
<View style={styles.statsGrid}>
  <View style={styles.statCard}>
    <LinearGradient
      colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
      style={styles.statIconContainer}
    >
      <Users size={24} color="#8B5CF6" strokeWidth={2} />
    </LinearGradient>
    <Text style={styles.statValue}>{users.length}</Text>
    <Text style={styles.statLabel}>Total Users</Text>
  </View>

  <View style={styles.statCard}>
    <LinearGradient
      colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
      style={styles.statIconContainer}
    >
      <Crown size={24} color="#8B5CF6" strokeWidth={2} />
    </LinearGradient>
    <Text style={styles.statValue}>{users.filter((u) => u.role === 'admin').length}</Text>
    <Text style={styles.statLabel}>Admins</Text>
  </View>

  <View style={styles.statCard}>
    <LinearGradient
      colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
      style={styles.statIconContainer}
    >
      <UserCheck size={24} color="#10B981" strokeWidth={2} />
    </LinearGradient>
    <Text style={styles.statValue}>{users.filter((u) => u.role === 'staff').length}</Text>
    <Text style={styles.statLabel}>Staff</Text>
  </View>

  <View style={styles.statCard}>
    <LinearGradient
      colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
      style={styles.statIconContainer}
    >
      <CheckCircle size={24} color="#10B981" strokeWidth={2} />
    </LinearGradient>
    <Text style={styles.statValue}>
      {users.filter((u) => u.status === 'active').length}
    </Text>
    <Text style={styles.statLabel}>Active Now</Text>
  </View>
</View>
      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'android' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
  >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Avatar Preview */}
              <View style={styles.avatarPreview}>
                <LinearGradient
                  colors={['#8B5CF6', '#4f46e5']}
                  style={styles.avatarPreviewLarge}
                >
                  <Text style={styles.avatarPreviewText}>
                    {newUserData.firstName ? newUserData.firstName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </LinearGradient>
              </View>

              {/* Personal Information */}
              <Text style={styles.sectionTitleModal}>Personal Information</Text>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newUserData.firstName}
                  onChangeText={(text) => setNewUserData({ ...newUserData, firstName: text })}
                  placeholder="Enter first name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newUserData.lastName}
                  onChangeText={(text) => setNewUserData({ ...newUserData, lastName: text })}
                  placeholder="Enter last name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
  style={[
    styles.fieldInput,
    fieldErrors.email && { borderColor: 'red' }
  ]}
  value={newUserData.email}
  onChangeText={text => setNewUserData({ ...newUserData, email: text })}
  placeholder="user@example.com"
  keyboardType="email-address"
  autoCapitalize="none"
/>
{fieldErrors.email ? <Text style={{ color: 'red', marginTop: 4 }}>{fieldErrors.email}</Text> : null}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Phone *</Text>
                <TextInput
  style={[
    styles.fieldInput,
    fieldErrors.phone && { borderColor: 'red' }
  ]}
  value={newUserData.phone}
  onChangeText={text => setNewUserData({ ...newUserData, phone: text })}
  placeholder="+216 XX XXX XXX"
  keyboardType="phone-pad"
/>
{fieldErrors.phone ? <Text style={{ color: 'red', marginTop: 4 }}>{fieldErrors.phone}</Text> : null}
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserData.role === 'staff' && styles.roleOptionActive,
                    ]}
                    onPress={() => setNewUserData({ ...newUserData, role: 'staff' })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserData.role === 'staff' && styles.roleOptionTextActive,
                      ]}
                    >
                      Staff
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      newUserData.role === 'admin' && styles.roleOptionActive,
                    ]}
                    onPress={() => setNewUserData({ ...newUserData, role: 'admin' })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUserData.role === 'admin' && styles.roleOptionTextActive,
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {newUserData.role === 'staff' && (
  <View style={styles.formField}>
    <Text style={styles.fieldLabel}>Functional Grade *</Text>
    <TextInput
      style={styles.fieldInput}
      value={newUserData.functionalGrade}
      onChangeText={text => setNewUserData({ ...newUserData, functionalGrade: text })}
      placeholder="Select or type grade"
      placeholderTextColor="#9CA3AF"
    />
    {/* Dropdown suggestions */}
    {functionalGrades
      .filter(g => g.toLowerCase().includes(newUserData.functionalGrade.toLowerCase()) && g !== newUserData.functionalGrade)
      .map((grade, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => setNewUserData({ ...newUserData, functionalGrade: grade })}
          style={{ padding: 8, backgroundColor: '#F3F4F6', marginTop: 2, borderRadius: 8 }}
        >
          <Text>{grade}</Text>
        </TouchableOpacity>
      ))}
  </View>
)}


              {/* Security */}
<Text style={styles.sectionTitleModal}>Security</Text>

<View style={styles.formField}>
  <Text style={styles.fieldLabel}>Generated Password</Text>
  <View style={styles.passwordContainer}>
    <TextInput
      style={[styles.fieldInput, styles.passwordInput]}
      value={generatedPassword}
      editable={false}
    />
    <TouchableOpacity 
      style={styles.btnReload} 
      onPress={() => {
        const newPassword = generatePassword();
        setGeneratedPassword(newPassword);
        setPasswordCopied(false);
        showToast('success', 'New password generated!');
      }}
    >
      <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.btnCopy} onPress={copyPassword}>
      <Ionicons
        name={passwordCopied ? 'checkmark' : 'copy-outline'}
        size={20}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  </View>
  <Text style={styles.fieldHint}>
    ⚠️ Save this password! Share it securely with the new user.
  </Text>
</View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitNewUser} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimary}
                >
                  <Text style={styles.btnPrimaryText}>Create User</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Avatar Preview */}
              <View style={styles.avatarPreview}>
                <LinearGradient
                  colors={['#8B5CF6', '#4f46e5']}
                  style={styles.avatarPreviewLarge}
                >
                  <Text style={styles.avatarPreviewText}>
                    {editUserData.firstName
                      ? editUserData.firstName.charAt(0).toUpperCase()
                      : userToEdit?.initials}
                  </Text>
                </LinearGradient>
              </View>

              {/* Personal Information */}
              <Text style={styles.sectionTitleModal}>Personal Information</Text>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editUserData.firstName}
                  onChangeText={(text) => setEditUserData({ ...editUserData, firstName: text })}
                  placeholder="Enter first name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editUserData.lastName}
                  onChangeText={(text) => setEditUserData({ ...editUserData, lastName: text })}
                  placeholder="Enter last name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editUserData.email}
                  onChangeText={(text) => setEditUserData({ ...editUserData, email: text })}
                  placeholder="user@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editUserData.phone}
                  onChangeText={(text) => setEditUserData({ ...editUserData, phone: text })}
                  placeholder="Leave empty to keep current"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Role *</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      editUserData.role === 'staff' && styles.roleOptionActive,
                    ]}
                    onPress={() => setEditUserData({ ...editUserData, role: 'staff' })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        editUserData.role === 'staff' && styles.roleOptionTextActive,
                      ]}
                    >
                      Staff
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      editUserData.role === 'admin' && styles.roleOptionActive,
                    ]}
                    onPress={() => setEditUserData({ ...editUserData, role: 'admin' })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        editUserData.role === 'admin' && styles.roleOptionTextActive,
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editUserData.role === 'staff' && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Functional Grade *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editUserData.functionalGrade}
                    onChangeText={(text) =>
                      setEditUserData({ ...editUserData, functionalGrade: text })
                    }
                    placeholder="e.g. Senior Officer, Grade A2"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitEditUser} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimary}
                >
                  <Text style={styles.btnPrimaryText}> Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentSmall]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete User</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.deleteConfirmation}>
                <Text style={styles.deleteIcon}>⚠️</Text>
                <Text style={styles.deleteTitle}>Are you sure?</Text>
                <Text style={styles.deleteMessage}>
                  You are about to delete{' '}
                  <Text style={styles.deleteUserName}>{userToDelete?.name}</Text>. This action
                  cannot be undone.
                </Text>
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnDanger}
                >
                  <Text style={styles.btnDangerText}>Delete User</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },

  // Toast Notification
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastError: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  toastSuccess: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  toastWarning: {
    backgroundColor: '#FEFCE8',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  toastIcon: {
    fontSize: 20,
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Header
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

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Users Section
  usersSection: {
    padding: 16,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  btnAddFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },

  // User Card
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userCardBody: {
    padding: 16,
  },
  userMeta: {
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },

  // Badges
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  badgeStaff: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextAdmin: {
    color: '#8B5CF6',
  },
  badgeTextStaff: {
    color: '#10B981',
  },

  // User Actions
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  actionBtnEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  actionBtnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionBtnDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContentSmall: {
    maxHeight: '60%',
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
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  avatarPreviewLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarPreviewText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitleModal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  fieldInput: {
    width: '100%',
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleOptionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleOptionTextActive: {
    color: '#8B5CF6',
  },
  passwordContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
    fontFamily: 'monospace',
  },
  btnReload: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCopy: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldHint: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 12,
    color: '#e71d1d',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  btnSecondary: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnDanger: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Delete Confirmation
  deleteConfirmation: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  deleteIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteUserName: {
    fontWeight: '700',
    color: '#111827',
  },
});

export default AdminUsers;