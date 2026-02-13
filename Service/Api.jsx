import axios from "axios";

export const api = axios.create({
  baseURL: "http://172.28.40.165:5000/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

