import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://172.28.40.165:5000/api/users";


const getAuthHeaders = async () => {
  try {
    const userString = 
      await AsyncStorage.getItem("user") || 
      await AsyncStorage.getItem("userData");

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


export const getUsers = async () => {
  console.log("🔵 users.js - getUsers function called");

  try {
    const config = await getAuthHeaders();
    const response = await axios.get(API_URL, config);
    console.log("✅ Users fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching users:", error.response?.data || error.message);
    throw error;
  }
};


export const createUser = async (userData) => {
  console.log("🔵 users.js - createUser function called with:", userData);

  try {
    const config = await getAuthHeaders();
    const response = await axios.post(API_URL, userData, config);
    console.log("✅ users.js - User created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating user:", error.response?.data || error.message);
    throw error;
  }
};


export const updateUser = async (userId, userData) => {
  console.log("🔵 users.js - updateUser function called for user:", userId, "with data:", userData);

  try {
    const config = await getAuthHeaders();
    const response = await axios.put(`${API_URL}/${userId}`, userData, config);
    console.log("✅ users.js - User updated successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating user:", error.response?.data || error.message);
    throw error;
  }
};


export const deleteUser = async (userId) => {
  console.log("🔵 users.js - deleteUser function called for user:", userId);

  try {
    const config = await getAuthHeaders();
    const response = await axios.delete(`${API_URL}/${userId}`, config);
    console.log("✅ users.js - User deleted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting user:", error.response?.data || error.message);
    throw error;
  }
};

export const getFunctionalGrades = async () => {
  console.log("🔵 users.js - getFunctionalGrades function called");

  try {
    const config = await getAuthHeaders(); // ✅ was missing await
    const response = await axios.get(`${API_URL}/grades`, config);
    console.log("✅ users.js - Grades fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ users.js - Error fetching grades:", error.response?.data || error.message);
    throw error;
  }
};


export const getFloors = async () => { // ✅ was missing entirely
  console.log("🔵 users.js - getFloors function called");

  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/floors`, config);
    console.log("✅ users.js - Floors fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ users.js - Error fetching floors:", error.response?.data || error.message);
    throw error;
  }
};

export const getOfficeRooms = async () => { // ✅ was missing entirely
  console.log("🔵 users.js - getOfficeRooms function called");

  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${API_URL}/rooms`, config);
    console.log("✅ users.js - Rooms fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ users.js - Error fetching rooms:", error.response?.data || error.message);
    throw error;
  }
};

export const sendHeartbeat = async () => {
  try {
    const config = await getAuthHeaders();
    console.log('💓 Heartbeat token:', config.headers.Authorization);
    await axios.post(`${API_URL}/heartbeat`, {}, config);
    console.log('💓 Heartbeat OK');
  } catch (error) {
    console.warn("⚠️ Heartbeat failed:", error.message);
  }
};

export const markOffline = async () => {
  try {
    const config = await getAuthHeaders(); // ✅ was missing await
    await axios.post(`${API_URL}/offline`, {}, config);
  } catch (error) {
    console.warn("⚠️ users.js - markOffline failed:", error.message);
  }
};