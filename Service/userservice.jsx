
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage"

const API_URL = "http://172.28.40.165:5000/api/user"; 


const getAuthToken = async () => {
  try {
    const userJson = await AsyncStorage.getItem("userData");
    if (userJson) {
      const user = JSON.parse(userJson);
      return user?.token || "";
    }
    return "";
  } catch (error) {
    return "";
  }
};
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;

  if (avatarPath.startsWith("http")) {
    return avatarPath;
  }

  return `${API_URL}${avatarPath}`;
};


export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem("userData", JSON.stringify(user));
  } catch (error) {
    console.error("Error saving user:", error);
    throw error;
  }
};


export const getUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem("userData");
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

export const updateProfile = async (formData) => {
  try {
    const token = await getAuthToken();

    const response = await axios.put(
      `${API_URL}/update-profile`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};


export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const token = await getAuthToken(); 

    const response = await axios.put(
      `${API_URL}/update-password`,
      { currentPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};


export const getUserProfile = async () => {
  try {
    const token = await getAuthToken();

    const response = await axios.get(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};
