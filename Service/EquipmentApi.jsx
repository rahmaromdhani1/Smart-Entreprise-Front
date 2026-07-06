// Service/EquipmentApi.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL      = 'http://172.28.40.165:5000';
const EQUIPMENT_URL = `${BASE_URL}/api/equipment`;

axios.defaults.baseURL = BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

export const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// ─── GET All Equipments ───────────────────────────────────────────────────────
export const getEquipments = async () => {
  try {
    await getAuthHeader();
    const response = await axios.get(EQUIPMENT_URL);
    return response.data.data || [];
  } catch (error) {
    console.error('[EquipmentApi] getEquipments error:', error.message);
    throw error;
  }
};

// ─── GET Single Equipment by ID ───────────────────────────────────────────────
export const getEquipmentById = async (id) => {
  try {
    await getAuthHeader();
    const response = await axios.get(`${EQUIPMENT_URL}/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`[EquipmentApi] getEquipmentById(${id}) error:`, error.message);
    throw error;
  }
};

// ─── CREATE Equipment ─────────────────────────────────────────────────────────
export const createEquipment = async (payload) => {
  try {
    await getAuthHeader();
    const response = await axios.post(EQUIPMENT_URL, payload);
    return response.data.data;
  } catch (error) {
    console.error('[EquipmentApi] createEquipment error:', error.message);
    throw error;
  }
};

// ─── UPDATE Equipment ─────────────────────────────────────────────────────────
export const updateEquipment = async (id, payload) => {
  try {
    await getAuthHeader();
    const response = await axios.put(`${EQUIPMENT_URL}/${id}`, payload);
    return response.data.data;
  } catch (error) {
    console.error(`[EquipmentApi] updateEquipment(${id}) error:`, error.message);
    throw error;
  }
};

// ─── DELETE Equipment ─────────────────────────────────────────────────────────
export const deleteEquipment = async (id) => {
  try {
    await getAuthHeader();
    const response = await axios.delete(`${EQUIPMENT_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`[EquipmentApi] deleteEquipment(${id}) error:`, error.message);
    throw error;
  }
};

// ─── GET All Floors ───────────────────────────────────────────────────────────
export const getEquipmentFloors = async () => {
  try {
    await getAuthHeader();
    const response = await axios.get(`${EQUIPMENT_URL}/floors`);
    return response.data.data || [];
  } catch (error) {
    console.error('[EquipmentApi] getEquipmentFloors error:', error.message);
    throw error;
  }
};

// ─── GET All Office Rooms ─────────────────────────────────────────────────────
export const getEquipmentRooms = async () => {
  try {
    await getAuthHeader();
    const response = await axios.get(`${EQUIPMENT_URL}/officeRooms`);
    return response.data.data || [];
  } catch (error) {
    console.error('[EquipmentApi] getEquipmentRooms error:', error.message);
    throw error;
  }
};

// ─── GET Equipment by MAC ─────────────────────────────────────────────────────
export const getEquipmentByMac = async (mac) => {
  try {
    await getAuthHeader();
    const response = await axios.get(`${EQUIPMENT_URL}/mac/${mac}`);
    return response.data.data;
  } catch (error) {
    console.error(`[EquipmentApi] getEquipmentByMac(${mac}) error:`, error.message);
    throw error;
  }
};

// ─── GET Equipment by NodeId ──────────────────────────────────────────────────
export const getEquipmentByNodeId = async (nodeId) => {
  try {
    await getAuthHeader();
    const response = await axios.get(`${EQUIPMENT_URL}/node/${nodeId}`);
    return response.data.data;
  } catch (error) {
    console.error(`[EquipmentApi] getEquipmentByNodeId(${nodeId}) error:`, error.message);
    throw error;
  }
};

// ─── GET Live Device Statuses (source of truth: devicestatuses collection) ────
// Returns: { MAC_UPPERCASE: boolean, ... }
export const getLiveDeviceStatuses = async () => {
  try {
    const response = await axios.get(`${EQUIPMENT_URL}/statuses`);
    return response.data;
  } catch (error) {
    console.error('[EquipmentApi] getLiveDeviceStatuses error:', error.message);
    throw error;
  }
};

export default {
  getEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentFloors,
  getEquipmentRooms,
  getEquipmentByMac,
  getEquipmentByNodeId,
  getLiveDeviceStatuses,
};