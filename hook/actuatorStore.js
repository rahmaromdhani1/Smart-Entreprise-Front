// hook/actuatorStore.js
// Store singleton — survit aux unmounts de composants
let state = {};
const listeners = new Set();

export const actuatorStore = {
  get: (key) => state[key],
  set: (key, val) => {
    state = { ...state, [key]: val };
    listeners.forEach(fn => fn(state));
  },
  getAll: () => state,
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  clear: () => { state = {}; },
};