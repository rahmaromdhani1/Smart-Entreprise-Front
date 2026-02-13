import AsyncStorage from '@react-native-async-storage/async-storage';

const storageService = {
  // Stocker le token et les informations utilisateur
  saveUserData: async (userData) => {
    try {
      await AsyncStorage.setItem('userToken', userData.token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      console.log("✅ TOKEN SAVED:", userData.token);
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
      return false;
    }
  },

  // Récupérer le token
  getToken: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return token;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  },

  // Récupérer les données utilisateur
  getUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
  },

  // Supprimer les données (déconnexion)
  clearUserData: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
      return false;
    }
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      return false;
    }
  },
};

export default storageService;