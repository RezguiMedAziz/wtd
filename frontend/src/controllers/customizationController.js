// Workflow rules for the phone-case customization steps.
export const STEPS = [
  { id: 1, label: 'Phone', title: 'Which phone do you have?' },
  { id: 2, label: 'Case', title: 'Choose your case' },
  { id: 3, label: 'Stickers', title: 'Personalize your case' },
  { id: 4, label: 'Review', title: 'Review & save your design' },
];

export function canEnterStep(step, s) {
  if (step <= 1) return true;
  if (step === 2) return !!s.phone;
  return !!s.phone && !!s.caseType && (s.caseType !== 'silicone' || !!s.color);
}

export const canContinue = (step, s) => canEnterStep(step + 1, s);

export function summarize(s) {
  return {
    phone: s.phone ? `${s.phone.brand === 'Custom' ? '' : `${s.phone.brand} `}${s.phone.name}`.trim() : '—',
    caseType: s.caseType === 'silicone' ? 'Silicone case' : s.caseType === 'transparent' ? 'Transparent case' : '—',
    stickerCount: s.stickers.length,
    uploadedCount: s.uploads.length,
    customModel: !!s.phone?.needsVerification,
  };
}
