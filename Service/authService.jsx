import { api } from './Api';

const API_URL = 'http://172.28.40.165:5000'; 

const authService = {
  // ========== LOGIN ==========
  login: async (mail, password, role) => {
    try {
      const response = await api.post('/auth/login', { mail, password, selectedRole: role });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Server connection error',
      };
    }
  },

  // ========== FORGOT PASSWORD ==========
  forgotPassword: async (mail) => {
    try {
      const response = await api.post('/auth/forgot-password', { mail });
      
      return {
        success: true,
        message: response.data.message || 'If this email exists, a reset email has been sent',
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error sending reset email',
      };
    }
  },

  // ========== VERIFY RESET TOKEN ==========
verifyResetToken: async (token) => {
  try {
    const response = await api.post('/auth/verify-reset-token', {
      token,
    });

    return {
      success: response.data.valid,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Invalid or expired token',
    };
  }
},


  // ========== RESET PASSWORD ==========
  resetPassword: async (token, newPassword, confirmPassword) => {
  try {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
      confirmPassword,
    });

    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error resetting password',
    };
  }
},


  // ========== LOGOUT ==========
  logout: async () => {
    try {
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error logging out',
      };
    }
  },
};

export default authService;