import { storageService } from './storageService';
import { apiClient } from './api/apiClient';

const FIELDS = ['firstName', 'lastName', 'mobile', 'email', 'address', 'city', 'postalCode'];
const isValidUser = (u) => u && typeof u === 'object' && FIELDS.every((f) => typeof u[f] === 'string' && u[f].trim());

export const onboardingService = {
  // The profile is cached locally for the UI; the backend session token proves who the user is.
  getUser() {
    const user = storageService.get('user');
    if (isValidUser(user) && storageService.get('token')) return user;
    if (user) storageService.remove('user'); // corrupted or without a session
    return null;
  },
  async saveUser(values) {
    const body = Object.fromEntries(FIELDS.map((f) => [f, String(values[f] ?? '').trim()]));
    const { user, token } = await apiClient.post('/users', body, { auth: false });
    storageService.set('token', token);
    storageService.set('user', user);
    return user;
  },
  clearUser() {
    storageService.remove('user');
    storageService.remove('token');
  },
};
