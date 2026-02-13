import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://172.28.40.165:5000/api/users";

/**
 * Helper function to get authorization headers
 */
const getAuthHeaders = async () => {
  try {
    const userString = await AsyncStorage.getItem("userData");

    if (!userString) {
      throw new Error("No authentication token found");
    }

    const user = JSON.parse(userString);

    if (!user.token) {
      throw new Error("No authentication token found");
    }

    return {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
  } catch (error) {
    console.error("❌ Error getting auth headers:", error.message);
    throw new Error("Authentication required. Please log in again.");
  }
};

/**
 * Get all users
 */
export const getUsers = async () => {
  console.log("🔵 users.js - getUsers function called");

  try {
    const config = await getAuthHeaders();
    const response = await axios.get(API_URL, config);

    console.log("✅ Users fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error fetching users:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(API_URL, userData, config);

    return response.data;
  } catch (error) {
    console.error(
      "❌ Error creating user:",
      error.response?.data || error.message
    );
    throw error;
  }
};


/**
 * Update an existing user
 */
export const updateUser = async (userId, userData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.put(
      `${API_URL}/${userId}`,
      userData,
      config
    );

    return response.data;
  } catch (error) {
    console.error(
      "❌ Error updating user:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.delete(
      `${API_URL}/${userId}`,
      config
    );

    return response.data;
  } catch (error) {
    console.error(
      "❌ Error deleting user:",
      error.response?.data || error.message
    );
    throw error;
  }
};