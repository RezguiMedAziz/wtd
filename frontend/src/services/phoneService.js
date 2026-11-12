import { apiClient } from './api/apiClient';

// Catalog lives on the backend (backend/app/data/phones.json).
export const phoneService = {
  brands: () => apiClient.get('/phones/brands', { auth: false }),
  search: ({ query = '', brand = 'All' } = {}, opts) =>
    apiClient.get(`/phones${apiClient.qs({ q: query.trim(), brand: brand === 'All' ? '' : brand })}`, opts),
  // Unknown model typed by the user — stored server-side and flagged for catalog verification.
  createCustom(name) {
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (clean.length < 2) return Promise.reject(new Error('Please type your phone model.'));
    return apiClient.post('/phones/custom', { name: clean });
  },
};
