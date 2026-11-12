import PhonePreview from './PhonePreview';
import StickerLayer from './StickerLayer';

/** Read-only render of a design: phone + case + color + stickers (same layering, position, scale, rotation). */
export default function DesignPreview({ s, className = 'w-56' }) {
  return (
    <PhonePreview phone={s.phone} caseType={s.caseType} color={s.color} className={className}>
      <StickerLayer stickers={s.stickers} />
    </PhonePreview>
  );
}