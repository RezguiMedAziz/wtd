import { useEffect, useReducer } from 'react';
import { CASE_TYPES, SILICONE_COLORS } from '../constants/caseColors';
import { isHex } from '../utils/ColorPicker';
import { apiClient } from './api/apiClient';

// Bundled defaults keep the UI usable instantly; the backend list (backend/app/data/cases.json) replaces them.
// The list is only a set of suggested swatches: the backend accepts ANY valid HEX / rgb() color.
let config = { types: CASE_TYPES, siliconeColors: SILICONE_COLORS };
let loading = null;

export const caseService = {
  types: () => config.types,
  colors: () => config.siliconeColors,
  // `id` is a palette id ('pink') or any '#rrggbb' (picked on the color wheel, or returned by the backend,
  // which stores every color as hex). A hex that equals a swatch resolves to that swatch (label + id).
  color(id) {
    if (isHex(id)) {
      const hit = config.siliconeColors.find((c) => String(c.hex).toLowerCase() === id.toLowerCase());
      return hit || { id, label: `Custom color (${id.toUpperCase()})`, hex: id };
    }
    return config.siliconeColors.find((c) => c.id === id) || config.siliconeColors[0];
  },
  type: (id) => config.types.find((t) => t.id === id) || null,
  load() {
    if (!loading) {
      loading = apiClient.get('/cases/config', { auth: false }).then((c) => { config = c; return c; }).catch(() => { loading = null; return config; });
    }
    return loading;
  },
};

/** Loads the case config once and re-renders the calling component when it arrives. */
export function useCaseConfig() {
  const [, rerender] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    let alive = true;
    caseService.load().then(() => alive && rerender());
    return () => { alive = false; };
  }, []);
}