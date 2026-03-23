


import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://172.28.40.165:5000';
const EQUIPMENT_URL = `${BASE_URL}/api/equipment`;


export const getEquipments = async () => {
  const response = await axios.get(EQUIPMENT_URL);
  return response.data.data;
};

export const createEquipment = async (payload) => {
  const response = await axios.post(EQUIPMENT_URL, payload);
  return response.data.data;
};


export const updateEquipment = async (id, payload) => {
  const response = await axios.put(`${EQUIPMENT_URL}/${id}`, payload);
  return response.data.data;
};

export const deleteEquipment = async (id) => {
  const response = await axios.delete(`${EQUIPMENT_URL}/${id}`);
  return response.data.data;
};