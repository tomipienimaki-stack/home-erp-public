import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pub = join(__dirname, '../../public');
const manifest = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');

function pngSize(file: string): { w: number; h: number } {
  const buf = readFileSync(join(pub, file));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe('manifest.webmanifest', () => {
  it('REQ-M03-1: nimi, aloitus ja värit', () => {
    expect(manifest.name).toBe('Koti');
    expect(manifest.short_name).toBe('Koti');
    expect(manifest.start_url).toBe('/shopping');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#FBF8F2');
    expect(manifest.theme_color).toBe('#2D4A3E');
    expect(manifest.lang).toBe('fi');
  });

  it('REQ-M03-1: ei scope-kenttää', () => {
    expect(manifest).not.toHaveProperty('scope');
  });

  it('REQ-M03-3: täsmälleen kolme ikonia (192, 512 any, 512 maskable)', () => {
    const icons: { src: string; sizes: string; type: string; purpose?: string }[] = manifest.icons;
    expect(icons).toHaveLength(3);
    const find = (sizes: string, purpose: string) =>
      icons.find((i) => i.sizes === sizes && (i.purpose ?? 'any') === purpose);
    expect(find('192x192', 'any')?.src).toBe('/icon-192.png');
    expect(find('512x512', 'any')?.src).toBe('/icon-512.png');
    expect(find('512x512', 'maskable')?.src).toBe('/icon-512-maskable.png');
    for (const i of icons) expect(i.type).toBe('image/png');
  });
});

describe('ikonitiedostot', () => {
  it.each([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-512-maskable.png', 512],
    ['apple-touch-icon.png', 180],
  ])('REQ-M03-2: %s on %i×%i PNG', (file, size) => {
    expect(existsSync(join(pub, file))).toBe(true);
    expect(pngSize(file)).toEqual({ w: size, h: size });
  });

  it('REQ-M03-1: manifestin ikonitiedostot ovat olemassa', () => {
    for (const i of manifest.icons) expect(existsSync(join(pub, i.src))).toBe(true);
  });
});

describe('index.html', () => {
  it('REQ-M03-3: linkittää manifestiin', () => {
    expect(html).toMatch(/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/);
  });

  it('REQ-M03-3: linkittää apple-touch-iconiin', () => {
    expect(html).toMatch(/<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/);
  });

  it('REQ-M03-3: theme-color on #2D4A3E ja tageja on yksi', () => {
    const tags = html.match(/<meta[^>]+name="theme-color"[^>]*>/g) ?? [];
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('content="#2D4A3E"');
  });

  it('REQ-M03-4: ei service worker -viitettä', () => {
    expect(html).not.toContain('serviceWorker');
  });
});
