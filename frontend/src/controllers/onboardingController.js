import { onboardingService } from '../services/onboardingService';

export const EMPTY_FORM = { firstName: '', lastName: '', mobile: '', email: '', address: '', city: '', postalCode: '' };

const RULES = {
  firstName: (v) => (!v ? 'Quack! We need your first name.' : v.length < 2 ? 'That looks a bit short.' : ''),
  lastName: (v) => (!v ? 'Please tell us your last name.' : v.length < 2 ? 'That looks a bit short.' : ''),
  mobile: (v) => (!v ? 'We need a mobile number.' : !/^\+?[0-9][0-9\s.-]{6,16}[0-9]$/.test(v) ? 'Use digits only, e.g. +216 20 123 456.' : ''),
  email: (v) => (!v ? 'An email address is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Hmm, that email looks off.' : ''),
  address: (v) => (!v ? 'Where should the ducks deliver?' : v.length < 5 ? 'Add a bit more detail.' : ''),
  city: (v) => (!v ? 'Please add your city.' : ''),
  postalCode: (v) => (!v ? 'Postal code is required.' : !/^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/.test(v) ? 'Check your postal code.' : ''),
};

export const validateField = (name, value) => RULES[name]((value ?? '').trim());

export function validateForm(values) {
  const errors = {};
  Object.keys(RULES).forEach((name) => {
    const msg = validateField(name, values[name]);
    if (msg) errors[name] = msg;
  });
  return errors;
}

export async function submitOnboarding(values) {
  const errors = validateForm(values);
  if (Object.keys(errors).length) return { ok: false, errors };
  const user = await onboardingService.saveUser(values);
  return { ok: true, user };
}
