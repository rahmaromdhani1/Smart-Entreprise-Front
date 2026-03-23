// Service/SeuilApi.jsx
import axios from "axios";

const API_BASE = "http://172.28.40.165:5000/api"; 
const api = axios.create({
  baseURL: `${API_BASE}/seuils`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const LOG = "[seuilApi]";

const unwrap = (response) => response?.data ?? response;

const normalizeError = (error, fallbackMessage) => {
  const status  = error?.response?.status;
  const message = error?.response?.data?.message || error?.message || fallbackMessage;

  console.error(`${LOG} ${fallbackMessage}`, {
    status,
    message,
    data: error?.response?.data,
  });

  const err     = new Error(message);
  err.status    = status;
  err.details   = error?.response?.data;

  throw err;
};

/* ================================
   BASIC CRUD
================================ */

export const createSeuil = async (data) => {
  try {
    console.log(`${LOG} Creating seuil`, data);
    const response = await api.post("/", data);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to create seuil");
  }
};

export const getAllSeuils = async (params = {}) => {
  try {
    console.log(`${LOG} Fetching all seuils`, params);
    const response = await api.get("/", { params });
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to fetch seuils");
  }
};

export const getSeuilById = async (id) => {
  try {
    if (!id) throw new Error("ID is required");
    console.log(`${LOG} Fetching seuil by id`, { id });
    const response = await api.get(`/${id}`);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to fetch seuil");
  }
};

export const getSeuilByRef = async (seuilId) => {
  try {
    if (!seuilId) throw new Error("seuilId is required");
    console.log(`${LOG} Fetching seuil by ref`, { seuilId });
    const response = await api.get(`/ref/${seuilId}`);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to fetch seuil by ref");
  }
};

export const updateSeuil = async (id, data) => {
  try {
    if (!id) throw new Error("ID is required");
    console.log(`${LOG} Updating seuil`, { id, data });
    const response = await api.put(`/${id}`, data);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to update seuil");
  }
};

export const deleteSeuil = async (id) => {
  try {
    if (!id) throw new Error("ID is required");
    console.log(`${LOG} Deleting seuil`, { id });
    const response = await api.delete(`/${id}`);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to delete seuil");
  }
};

/* ================================
   SEUIL PROFILE (ManageSeuils)
================================ */

/**
 * GET /api/seuils/equipment/:equipmentId
 */
export const getSeuilProfileByEquipmentId = async (equipmentId) => {
  try {
    if (!equipmentId) throw new Error("equipmentId is required");
    console.log(`${LOG} Fetching seuil profile`, { equipmentId });
    const response = await api.get(`/equipment/${equipmentId}`);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to fetch seuil profile");
  }
};

/**
 * POST /api/seuils/equipment/:equipmentId/regenerate
 */
export const regenerateSeuilProfile = async (equipmentId) => {
  try {
    if (!equipmentId) throw new Error("equipmentId is required");
    console.log(`${LOG} Regenerating seuil profile`, { equipmentId });
    const response = await api.post(`/equipment/${equipmentId}/regenerate`);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to regenerate seuil profile");
  }
};

/**
 * PUT /api/seuils/equipment/:equipmentId
 */
export const updateSeuilProfile = async (equipmentId, payload) => {
  try {
    if (!equipmentId) throw new Error("equipmentId is required");
    console.log(`${LOG} Updating seuil profile`, { equipmentId, payload });
    const response = await api.put(`/equipment/${equipmentId}`, payload);
    return unwrap(response);
  } catch (error) {
    normalizeError(error, "Failed to update seuil profile");
  }
};

export default api;