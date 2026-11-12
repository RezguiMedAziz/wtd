// Tiny bridge so non-React code (services) can ask for the onboarding popup.
// AuthGateProvider registers its requireUser() here on mount.

/** Returned when the user closes the popup without finishing. */
export const GATE_CANCELLED = Symbol('gate-cancelled');

let gate = null;

export const authGate = {
  register(fn) {
    gate = fn;
  },
  /** Runs `action` once the user has a profile (opens the popup first if needed). */
  require(action) {
    return gate ? gate(action) : Promise.resolve().then(action);
  },
};