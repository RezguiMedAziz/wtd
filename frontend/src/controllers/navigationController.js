import { SHEETS_PATH } from '../services/sheetService';

export const navigationController = {
  // Everyone goes straight to the app after the splash screen, starting with the sticker-sheet marketplace.
  // Onboarding happens in a popup when the user places an order (see AuthGateContext).
  afterSplash: () => SHEETS_PATH,
};