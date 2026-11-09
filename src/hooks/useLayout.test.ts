import { getLayoutMode } from './useLayout';

describe('getLayoutMode', () => {
  it('uses the desktop layout on large screens', () => {
    expect(getLayoutMode(1440, 900)).toBe('desktop');
    expect(getLayoutMode(1024, 768)).toBe('desktop');
  });

  it('uses the compact layout for landscape phones, small tablets and short windows', () => {
    expect(getLayoutMode(844, 390)).toBe('compact');  // iPhone 14 landscape
    expect(getLayoutMode(740, 360)).toBe('compact');  // Android landscape
    expect(getLayoutMode(768, 1024)).toBe('compact'); // iPad portrait
    expect(getLayoutMode(1400, 560)).toBe('compact'); // short desktop window
  });

  it('asks phones held upright to rotate', () => {
    expect(getLayoutMode(390, 844)).toBe('rotate');
    expect(getLayoutMode(375, 667)).toBe('rotate');
  });
});
