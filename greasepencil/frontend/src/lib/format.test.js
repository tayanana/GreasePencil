import { describeRemaining, dollarsToCents, formatDistance, formatPartNumber } from './format';

describe('formatPartNumber', () => {
  it('groups a Mercedes ten-digit number', () => {
    expect(formatPartNumber('A2711800109')).toBe('A 271 180 01 09');
    expect(formatPartNumber('2711800109')).toBe('A 271 180 01 09');
  });

  it('leaves catalogue cross-references alone', () => {
    expect(formatPartNumber('HU 514 x')).toBe('HU 514 x');
    expect(formatPartNumber('ILFR6A')).toBe('ILFR6A');
    expect(formatPartNumber('N007603014106')).toBe('N007603014106');
  });
});

describe('distance and money', () => {
  it('describes remaining distance', () => {
    expect(formatDistance(-200, 'km')).toBe('200 km over');
    expect(formatDistance(1500, 'km')).toBe('1,500 km left');
    expect(formatDistance(0, 'km')).toBe('due at this odometer');
  });

  it('combines distance and days', () => {
    expect(describeRemaining({ distanceRemaining: -200, daysRemaining: -31 }, 'km'))
      .toBe('200 km over · 31 days over');
  });

  it('parses dollar input into cents', () => {
    expect(dollarsToCents('')).toBe(0);
    expect(dollarsToCents('40')).toBe(4000);
    expect(dollarsToCents('$40.50')).toBe(4050);
    expect(dollarsToCents('40.5')).toBe(4050);
    expect(dollarsToCents('nope')).toBeNull();
  });
});
