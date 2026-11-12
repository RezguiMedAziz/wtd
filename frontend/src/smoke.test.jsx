// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { validateUploads, MAX_UPLOADS } from './services/stickerService';
import { serialize, hydrate, toPayload } from './services/customizationService';
import { phoneService } from './services/phoneService';
import { backgroundRemovalService } from './services/backgroundRemovalService';
import { CustomizationProvider, useCustomization } from './context/CustomizationContext';
import PhonePreview from './components/customizer/PhonePreview';
import StickerLayer from './components/customizer/StickerLayer';
import Duck from './components/ducks/Duck';
import { CHARACTER_ORDER } from './constants/characters';
import { useStickerUploads } from './hooks/useStickerUploads';

const PHONES = [
  { id: 'apple-iphone-15-pro', brand: 'Apple', name: 'iPhone 15 Pro', camera: 'triple', ratio: 2.06, radius: 13, color: '#E6E3F0' },
  { id: 'samsung-galaxy-s25', brand: 'Samsung', name: 'Galaxy S25', camera: 'vertical', ratio: 2.08, radius: 13, color: '#DCE3EC' },
];
vi.mock('./services/phoneService', () => ({
  phoneService: {
    brands: vi.fn(async () => ['Apple', 'Samsung']),
    search: vi.fn(async ({ query = '' } = {}) => PHONES.filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(query.toLowerCase()))),
    createCustom: vi.fn(async (name) => ({ id: `custom-${name}`, brand: 'Custom', name, camera: 'dual', ratio: 2.05, radius: 13, color: '#E3E0E8', needsVerification: true })),
  },
}));
vi.mock('./services/backgroundRemovalService', () => ({
  backgroundRemovalService: {
    process: vi.fn(async (f) => { if (f.name.includes('bad')) throw new Error('engine down'); return { id: `srv_${f.name}`, src: `http://api/media/${f.name}`, ar: 1 }; }),
  },
}));

if (!window.PointerEvent) {
  window.PointerEvent = class extends MouseEvent { constructor(t, i = {}) { super(t, i); this.pointerId = i.pointerId; this.pointerType = i.pointerType || 'mouse'; } };
}
beforeEach(() => { localStorage.clear(); cleanup(); });
const file = (name, type = 'image/png', size = 100) => new File([new Uint8Array(size)], name, { type });

describe('validation', () => {
  it('rejects bad type, huge, empty files and enforces slots', () => {
    const r = validateUploads([file('a.gif', 'image/gif'), file('b.png', 'image/png', 13 * 1024 * 1024), file('c.png', 'image/png', 0), file('d.png'), file('e.jpg', 'image/jpeg'), file('f.png')], 2);
    expect(r.accepted.map((f) => f.name)).toEqual(['d.png', 'e.jpg']);
    expect(r.rejected).toHaveLength(4);
    expect(r.rejected.at(-1).reason).toMatch(/limit/i);
  });
});

describe('state, save/reopen, order', () => {
  let ctx;
  const Probe = () => { ctx = useCustomization(); return null; };
  const mount = () => render(<CustomizationProvider><Probe /></CustomizationProvider>);

  it('guards steps and keeps selections when going back', () => {
    mount();
    act(() => ctx.dispatch({ type: 'go', step: 3 }));
    expect(ctx.state.step).toBe(1);
    act(() => ctx.dispatch({ type: 'setPhone', phone: PHONES[0] }));
    act(() => ctx.dispatch({ type: 'setCaseType', value: 'silicone' }));
    act(() => ctx.dispatch({ type: 'setColor', value: 'blue' }));
    act(() => ctx.dispatch({ type: 'go', step: 3 }));
    act(() => ctx.dispatch({ type: 'addSticker', sticker: { kind: 'builtin', refId: 'heart-pink', src: 'x', ar: 1 } }));
    act(() => ctx.dispatch({ type: 'go', step: 1 }));
    act(() => ctx.dispatch({ type: 'go', step: 3 }));
    expect(ctx.state.stickers).toHaveLength(1);
    expect(ctx.state.color).toBe('blue');
  });
  it('builds the API payload and hydrates a server design back into state', () => {
    mount();
    act(() => ctx.dispatch({ type: 'setPhone', phone: PHONES[1] }));
    act(() => ctx.dispatch({ type: 'setCaseType', value: 'silicone' }));
    act(() => ctx.dispatch({ type: 'setColor', value: 'green' }));
    act(() => ctx.dispatch({ type: 'addUpload', upload: { id: 'u1', name: 'me.png', src: 'http://api/media/u1.png', ar: 1.2 } }));
    act(() => ctx.dispatch({ type: 'addSticker', sticker: { kind: 'builtin', refId: 'star-yellow', src: 'IGNORED', ar: 1, x: 30, y: 40, w: 20, rot: 15 } }));
    act(() => ctx.dispatch({ type: 'addSticker', sticker: { kind: 'upload', refId: 'u1', src: 'http://api/media/u1.png', ar: 1.2, x: 60, y: 70, w: 25, rot: -30 } }));
    const payload = toPayload(ctx.state, ' Duck case ');
    expect(payload).toMatchObject({ name: 'Duck case', phoneId: PHONES[1].id, caseType: 'silicone', color: 'green', uploadIds: ['u1'] });
    expect(payload.sessionId).toMatch(/^sess_/);
    expect(payload.stickers[0]).not.toHaveProperty('src');
    expect(payload.stickers[1]).toMatchObject({ kind: 'upload', refId: 'u1', x: 60, y: 70, w: 25, rot: -30 });
    expect(toPayload({ ...ctx.state, caseType: 'transparent' }).color).toBeNull();
    // the server answers with upload urls resolved and built-ins without src
    const fromServer = { id: 'd1', name: 'Duck case', phone: PHONES[1], caseType: 'silicone', color: 'green', sessionId: payload.sessionId,
      stickers: [{ ...payload.stickers[0], src: null }, { ...payload.stickers[1], src: 'http://api/media/u1.png' }], uploads: [{ id: 'u1', name: 'me.png', src: 'http://api/media/u1.png', ar: 1.2 }] };
    act(() => ctx.dispatch({ type: 'load', design: fromServer }));
    expect(ctx.state.step).toBe(3);
    expect(ctx.state.designId).toBe('d1');
    expect(ctx.state.sessionId).toBe(payload.sessionId);
    expect(ctx.state.stickers[0].src).toMatch(/^data:image\/svg/);
    expect(ctx.state.stickers[1]).toMatchObject({ src: 'http://api/media/u1.png', x: 60 });
    act(() => ctx.dispatch({ type: 'removeUpload', id: 'u1' }));
    expect(ctx.state.stickers).toHaveLength(1);
  });
  it('draft survives a reload with the same session id', () => {
    mount();
    act(() => ctx.dispatch({ type: 'setPhone', phone: PHONES[0] }));
    const sid = ctx.state.sessionId;
    return new Promise((r) => setTimeout(r, 500)).then(() => {
      cleanup();
      mount();
      expect(ctx.state.phone.id).toBe(PHONES[0].id);
      expect(ctx.state.sessionId).toBe(sid);
    });
  });
  it('enforces the 15 upload limit and reports failures honestly', async () => {
    let up; const P = () => { up = useStickerUploads(); ctx = useCustomization(); return null; };
    render(<CustomizationProvider><P /></CustomizationProvider>);
    const files = Array.from({ length: 17 }, (_, i) => file(`p${i}.png`));
    await act(async () => { up.handleFiles(files); });
    await waitFor(() => expect(ctx.state.uploads.length).toBe(MAX_UPLOADS), { timeout: 4000 });
    expect(up.messages.some((m) => /limit/i.test(m.text))).toBe(true);
    await act(async () => { up.handleFiles([file('more.png')]); });
    expect(ctx.state.uploads.length).toBe(MAX_UPLOADS);
    expect(backgroundRemovalService.process.mock.calls.at(-1)[1].sessionId).toBe(ctx.state.sessionId);
  });
  it('failed background removal adds no sticker and shows an error', async () => {
    let up; const P = () => { up = useStickerUploads(); ctx = useCustomization(); return null; };
    render(<CustomizationProvider><P /></CustomizationProvider>);
    await act(async () => { up.handleFiles([file('bad.png')]); });
    await waitFor(() => expect(up.messages.length).toBe(1));
    expect(ctx.state.uploads).toHaveLength(0);
    expect(up.messages[0].text).toMatch(/engine down/);
    expect(ctx.state.pending).toHaveLength(0);
  });
});

describe('rendering', () => {
  it('silicone layer uses the selected color and updates', () => {
    const phone = PHONES[0];
    const { container, rerender } = render(<PhonePreview phone={phone} caseType="silicone" color="pink" />);
    expect(container.querySelector('[data-testid="silicone-layer"]').getAttribute('fill')).toBe('#FF7FBD');
    rerender(<PhonePreview phone={phone} caseType="silicone" color="green" />);
    expect(container.querySelector('[data-testid="silicone-layer"]').getAttribute('fill')).toBe('#7EDBA3');
    rerender(<PhonePreview phone={phone} caseType="transparent" />);
    expect(container.querySelector('[data-testid="silicone-layer"]')).toBeNull();
  });
  it('moves, rotates/resizes, removes a sticker with pointer events and stays in bounds', () => {
    const patches = []; const removed = [];
    const s = { uid: 'a', src: 'x', ar: 1, x: 50, y: 50, w: 30, rot: 0 };
    const { container } = render(<div><StickerLayer interactive stickers={[s]} selectedUid="a" onSelect={() => {}} onChange={(u, p) => patches.push(p)} onRemove={(u) => removed.push(u)} /></div>);
    const layer = container.firstChild.firstChild;
    layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400 });
    layer.setPointerCapture = () => {}; layer.releasePointerCapture = () => {};
    const stickerEl = layer.firstChild;
    fireEvent.pointerDown(stickerEl, { clientX: 100, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(layer, { clientX: 5000, clientY: -5000, pointerId: 1 });
    const last = patches.at(-1);
    expect(last.x).toBeLessThanOrEqual(100) ; expect(last.x).toBeGreaterThan(50); expect(last.y).toBeGreaterThanOrEqual(0);
    fireEvent.pointerUp(layer, { pointerId: 1 });
    const handle = screen.getByRole('slider');
    fireEvent.pointerDown(handle, { clientX: 130, clientY: 230, pointerId: 2 });
    fireEvent.pointerMove(layer, { clientX: 190, clientY: 300, pointerId: 2 });
    const resized = patches.at(-1);
    expect(resized.w).toBeGreaterThan(30); expect(typeof resized.rot).toBe('number');
    fireEvent.click(screen.getByLabelText('Remove sticker'));
    expect(removed).toEqual(['a']);
  });
  it('each duck opens its own card with its story', () => {
    CHARACTER_ORDER.forEach((id) => {
      const { unmount } = render(<Duck name={id} size={100} />);
      fireEvent.click(screen.getByRole('button', { name: /^Meet/ }));
      expect(screen.getByRole('dialog').textContent.toLowerCase()).toContain(id);
      fireEvent.keyDown(window, { key: 'Escape' });
      unmount();
    });
  });
});

describe('step transitions', () => {
  it('moving from phone to case step shows the case options right away', async () => {
    const { default: PhonesCases } = await import('./pages/Dashboard/PhonesCases/PhonesCases');
    const { UserProvider } = await import('./context/UserContext');
    const { MemoryRouter } = await import('react-router-dom');
    render(<MemoryRouter><UserProvider><CustomizationProvider><PhonesCases /></CustomizationProvider></UserProvider></MemoryRouter>);
    fireEvent.click((await screen.findAllByRole('button', { name: /iPhone 15 Pro/ }))[0]);
    await waitFor(() => expect(screen.getByText('Transparent case')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByText('Silicone case')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Search a brand/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Choose silicone/i }));
    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'Silicone colors' })).toBeTruthy());
    fireEvent.click(screen.getByRole('radio', { name: 'Mint green' }));
    expect(document.querySelectorAll('[data-testid="silicone-layer"]')[0].getAttribute('fill')).toBe('#7EDBA3');
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    await waitFor(() => expect(screen.getByText('Sticker collection')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Review my design/ }));
    await waitFor(() => expect(screen.getByText('Save my design')).toBeTruthy());
  });
});
