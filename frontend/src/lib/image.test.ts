import { describe, expect, it } from 'vitest';
import { targetSize } from './image';

describe('targetSize', () => {
  it('REQ-M02-6: rajaa leveän kuvan pisimmän sivun 1600 px:iin ja säilyttää kuvasuhteen', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it('REQ-M02-6: rajaa korkean kuvan pisimmän sivun 1600 px:iin', () => {
    expect(targetSize(3000, 6000)).toEqual({ width: 800, height: 1600 });
  });

  it('REQ-M02-6: pientä kuvaa ei suurenneta', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(targetSize(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('REQ-M02-6: mukautettu max-arvo toimii', () => {
    expect(targetSize(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
  });
});
