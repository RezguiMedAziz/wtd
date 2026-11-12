import StickerLayer from '../customizer/StickerLayer';
import { toLayerStickers } from './sheetUtils';

/** Flat, read-only render of a sheet (thumbnails and admin cards). Same renderer as the phone preview.
 *  When the sheet has a background picture, it shows (at the sheet's opacity, over black) behind a frosted layer,
 *  like in the 3D view. */
export default function SheetFlat({ sheet, className = '' }) {
  const bg = sheet.background;
  const opacity = typeof sheet.backgroundOpacity === 'number' ? sheet.backgroundOpacity : 1;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-[3px] border-brand-ink ${bg ? 'bg-black' : 'bg-white/80'} ${className}`}
      style={{ aspectRatio: `1 / ${sheet.ratio || 1.35}` }}
    >
      {bg && (
        <>
          <div className="absolute inset-0" style={{ backgroundImage: `url("${bg}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity }} aria-hidden />
          <div className="absolute inset-0 bg-white/50" aria-hidden />
        </>
      )}
      <StickerLayer stickers={toLayerStickers(sheet)} />
    </div>
  );
}