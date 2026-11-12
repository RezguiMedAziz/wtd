import { useId } from 'react';
import { shade } from '../../utils/color';
import { caseService } from '../../services/caseService';

// Camera layouts in a 100-wide coordinate space (phone back, top-left module).
const CAMERAS = {
  triple: { plate: { x: 7, y: 7, w: 35, h: 35, rx: 10 }, lenses: [[18, 18], [18, 32], [32, 25]], r: 6.2, flash: [34, 14] },
  dual: { plate: { x: 7, y: 7, w: 28, h: 28, rx: 9 }, lenses: [[16, 16], [27, 27]], r: 5.4, flash: [27, 15] },
  vertical: { bare: true, plate: { x: 6, y: 7, w: 17, h: 42, rx: 8.5 }, lenses: [[14.5, 15], [14.5, 28], [14.5, 41]], r: 5, flash: null },
  bar: { plate: { x: 0, y: 14, w: 100, h: 17, rx: 0 }, lenses: [[28, 22.5], [44, 22.5]], r: 5.4, flash: [60, 22.5] },
  circle: { plate: { x: 6, y: 6, w: 40, h: 40, rx: 20 }, lenses: [[19, 19], [33, 19], [19, 33], [33, 33]], r: 5, flash: [26, 26] },
};

function Camera({ cam }) {
  return (
    <g>
      {!cam.bare && <rect {...cam.plate} fill="#23232B" stroke="#4A4A55" strokeWidth="0.9" />}
      {cam.lenses.map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={cam.r + 1.2} fill="#34343E" stroke="#6A6A78" strokeWidth="0.7" />
          <circle cx={cx} cy={cy} r={cam.r} fill="#0C0C12" />
          <circle cx={cx - cam.r * 0.3} cy={cy - cam.r * 0.3} r={cam.r * 0.22} fill="#fff" opacity="0.75" />
        </g>
      ))}
      {cam.flash && <circle cx={cam.flash[0]} cy={cam.flash[1]} r="2" fill="#FFF3C0" stroke="#8A8A94" strokeWidth="0.5" />}
    </g>
  );
}

/**
 * Layered phone preview: phone back → case (transparent or colored silicone) → stickers (children) → camera on top.
 * The silicone layer is drawn from the `color` prop, so changing it re-renders the real case.
 */
export default function PhonePreview({ phone, caseType, color = 'pink', children, className = '', clip = true }) {
  const uid = useId().replace(/:/g, '');
  const cam = CAMERAS[phone.camera] || CAMERAS.dual;
  const H = 100 * phone.ratio;
  const r = phone.radius;
  const hex = caseService.color(color).hex;
  const hole = { x: cam.plate.x - 2, y: cam.plate.y - 2, width: cam.plate.w + 4, height: cam.plate.h + 4, rx: cam.plate.rx + 2 };
  if (phone.camera === 'bar') { hole.x = 3; hole.width = 94; hole.rx = 3; }

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `100 / ${H}`, containerType: 'inline-size', '--phone-r': `${r}cqw` }}>
      <svg viewBox={`0 0 100 ${H}`} className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: 'drop-shadow(0 10px 14px rgba(20,20,20,.22))' }} aria-hidden>
        <defs>
          <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(phone.color, 0.35)} /><stop offset="1" stopColor={shade(phone.color, -0.12)} />
          </linearGradient>
          <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </linearGradient>
          <mask id={`m${uid}`}>
            <rect width="100" height={H} fill="#fff" />
            <rect {...hole} fill="#000" />
          </mask>
        </defs>
        <rect width="100" height={H} rx={r} fill={`url(#b${uid})`} stroke="#9A97A8" strokeWidth="0.8" />
        <Camera cam={cam} />
        {caseType === 'silicone' && (
          <g>
            <rect x="100" y={H * 0.2} width="1.8" height="13" rx="0.9" fill={shade(hex, -0.12)} />
            <rect x="100" y={H * 0.2 + 18} width="1.8" height="13" rx="0.9" fill={shade(hex, -0.12)} />
            <g mask={`url(#m${uid})`}>
              <rect width="100" height={H} rx={r} fill={hex} data-testid="silicone-layer" />
              <rect x="2.8" y="2.8" width="94.4" height={H - 5.6} rx={r - 2.8} fill="none" stroke={shade(hex, -0.16)} strokeWidth="0.9" />
              <rect width="100" height={H} rx={r} fill={`url(#s${uid})`} />
            </g>
            <rect {...hole} fill="none" stroke={shade(hex, -0.22)} strokeWidth="1.1" />
          </g>
        )}
        {caseType === 'transparent' && (
          <g>
            <rect width="100" height={H} rx={r} fill="#fff" fillOpacity="0.1" />
            <rect x="1.4" y="1.4" width="97.2" height={H - 2.8} rx={r - 1.4} fill="none" stroke="#CFEAFB" strokeOpacity="0.95" strokeWidth="2.6" />
            <rect x="0.4" y="0.4" width="99.2" height={H - 0.8} rx={r - 0.4} fill="none" stroke="#141414" strokeOpacity="0.28" strokeWidth="0.7" />
            <rect {...hole} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.3" />
            <rect width="100" height={H} rx={r} fill={`url(#s${uid})`} />
          </g>
        )}
      </svg>
      <div className="absolute inset-0" style={clip ? { overflow: 'hidden', borderRadius: `${r}cqw` } : undefined}>{children}</div>
      <svg viewBox={`0 0 100 ${H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <Camera cam={cam} />
      </svg>
    </div>
  );
}