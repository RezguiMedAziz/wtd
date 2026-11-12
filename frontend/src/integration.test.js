// @vitest-environment node
// Live test of the REAL services against a running backend:
//   backend: REMBG_MODEL=u2netp uvicorn app.main:app   ·   frontend: INTEGRATION=1 npx vitest run src/integration.test.js
import { describe, it, expect, beforeAll } from 'vitest';

const live = process.env.INTEGRATION ? describe : describe.skip;

live('frontend services ↔ FastAPI backend', () => {
  let s;
  beforeAll(async () => {
    const mem = new Map();
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
    s = {
      onboarding: (await import('./services/onboardingService')).onboardingService,
      phones: (await import('./services/phoneService')).phoneService,
      cases: (await import('./services/caseService')).caseService,
      bg: (await import('./services/backgroundRemovalService')).backgroundRemovalService,
      designs: await import('./services/customizationService'),
      orders: (await import('./services/orderService')).orderService,
      stickers: (await import('./services/stickerService')).stickerService,
    };
  });

  it('full journey: onboarding → phone → case → upload sticker → save → reopen → order', async () => {
    const user = await s.onboarding.saveUser({ firstName: 'Rzouga', lastName: 'Test', mobile: '+216 20 123 456', email: 'r@example.com', address: '12 Pond Street', city: 'Tunis', postalCode: '1000' });
    expect(user.id).toBeTruthy();
    expect(s.onboarding.getUser().firstName).toBe('Rzouga');

    expect(await s.phones.brands()).toContain('Apple');
    const found = await s.phones.search({ query: 'iphone 15 pro' });
    expect(found.map((p) => p.name)).toContain('iPhone 15 Pro');
    const custom = await s.phones.createCustom('Nokia  G42');
    expect(custom.needsVerification).toBe(true);
    expect((await s.phones.search({ query: 'nokia' })).length).toBe(1);

    const cfg = await s.cases.load();
    expect(cfg.siliconeColors.length).toBeGreaterThan(5);

    // a real picture with a busy background goes through the real model
    const fs = await import('node:fs');
    const buf = fs.readFileSync(process.env.TEST_IMAGE || '/tmp/in.jpg');
    const sticker = await s.bg.process(new File([buf], 'me.jpg', { type: 'image/jpeg' }), { sessionId: 'sess_int' });
    expect(sticker.id).toBeTruthy();
    expect(sticker.src).toMatch(/\/media\/stickers\/.+\.png$/);
    const img = await fetch(sticker.src);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');

    const state = {
      phone: found[0], caseType: 'silicone', color: 'lavender', sessionId: 'sess_int',
      stickers: [
        { uid: 'a', kind: 'builtin', refId: 'heart-pink', x: 30, y: 40, w: 20, rot: 15, ar: 0.9, src: 'x' },
        { uid: 'b', kind: 'upload', refId: sticker.id, x: 60, y: 70, w: 25, rot: -30, ar: sticker.ar, src: sticker.src },
      ],
      uploads: [{ id: sticker.id, name: 'me.jpg', src: sticker.src, ar: sticker.ar }], designId: null,
    };
    const saved = await s.designs.customizationService.save(state, { name: 'Integration design' });
    expect(saved.id).toBeTruthy();
    const list = await s.designs.customizationService.list();
    expect(list.map((d) => d.id)).toContain(saved.id);

    const reopened = s.designs.hydrate(await s.designs.customizationService.get(saved.id));
    expect(reopened.phone.name).toBe('iPhone 15 Pro');
    expect(reopened.color).toBe('lavender');
    expect(reopened.stickers).toHaveLength(2);
    expect(reopened.stickers[0].src).toMatch(/^data:image\/svg/);
    expect(reopened.stickers[1]).toMatchObject({ x: 60, y: 70, w: 25, rot: -30, src: sticker.src });
    expect(reopened.uploads[0].id).toBe(sticker.id);

    const order = await s.orders.createOrder({ ...state, designId: saved.id }, 'Integration design');
    expect(order.reference).toMatch(/^WTD-/);
    expect(order.customer.email).toBe('r@example.com');

    await s.designs.customizationService.remove(saved.id);
    expect((await s.designs.customizationService.list()).length).toBe(0);
  }, 180000);

  it('reports errors in plain words', async () => {
    const big = new File([new Uint8Array(100)], 'x.png', { type: 'image/png' });
    await expect(s.bg.process(big, { sessionId: 'sess_int' })).rejects.toThrow(/valid image/i);
  }, 60000);
});
