import {
  getCountryCoordinates,
  resolveCountryCode,
  PRESET_COUNTRY_COORDINATES,
  DEFAULT_SOUTH_AFRICA,
} from '../src/utils/countryLocation';

describe('countryLocation utility', () => {
  describe('resolveCountryCode', () => {
    it('returns ISO code when given a valid 2-letter country code', () => {
      expect(resolveCountryCode('ZA')).toBe('ZA');
      expect(resolveCountryCode('ng')).toBe('NG');
      expect(resolveCountryCode('GH')).toBe('GH');
      expect(resolveCountryCode('us')).toBe('US');
    });

    it('resolves country name to ISO code', () => {
      expect(resolveCountryCode('South Africa')).toBe('ZA');
      expect(resolveCountryCode('Nigeria')).toBe('NG');
      expect(resolveCountryCode('Ghana')).toBe('GH');
      expect(resolveCountryCode('United States')).toBe('US');
      expect(resolveCountryCode('United Kingdom')).toBe('GB');
      expect(resolveCountryCode('Kenya')).toBe('KE');
    });

    it('handles aliases like USA and UK', () => {
      expect(resolveCountryCode('USA')).toBe('US');
      expect(resolveCountryCode('UK')).toBe('GB');
    });

    it('infers ISO code from phone number when country is missing or invalid', () => {
      expect(resolveCountryCode(null, '+27712345678')).toBe('ZA');
      expect(resolveCountryCode(null, '+2348012345678')).toBe('NG');
      expect(resolveCountryCode(null, '+233241234567')).toBe('GH');
      expect(resolveCountryCode(null, '+14155552671')).toBe('US');
      expect(resolveCountryCode(null, '+442079460991')).toBe('GB');
    });

    it('falls back to ZA when both country and phone are missing', () => {
      expect(resolveCountryCode(null, null)).toBe('ZA');
      expect(resolveCountryCode('', '')).toBe('ZA');
    });
  });

  describe('getCountryCoordinates', () => {
    it('returns preset coordinates for South Africa', () => {
      const coords = getCountryCoordinates('South Africa');
      expect(coords.isoCode).toBe('ZA');
      expect(coords.latitude).toBe(PRESET_COUNTRY_COORDINATES.ZA.latitude);
      expect(coords.longitude).toBe(PRESET_COUNTRY_COORDINATES.ZA.longitude);
      expect(coords.latitudeDelta).toBeDefined();
    });

    it('returns preset coordinates for Nigeria', () => {
      const coords = getCountryCoordinates('Nigeria');
      expect(coords.isoCode).toBe('NG');
      expect(coords.latitude).toBe(PRESET_COUNTRY_COORDINATES.NG.latitude);
      expect(coords.longitude).toBe(PRESET_COUNTRY_COORDINATES.NG.longitude);
    });

    it('returns preset coordinates for Ghana', () => {
      const coords = getCountryCoordinates('Ghana');
      expect(coords.isoCode).toBe('GH');
      expect(coords.latitude).toBe(PRESET_COUNTRY_COORDINATES.GH.latitude);
      expect(coords.longitude).toBe(PRESET_COUNTRY_COORDINATES.GH.longitude);
    });

    it('returns coordinates when inferred from phone number', () => {
      const coords = getCountryCoordinates(null, '+2348012345678');
      expect(coords.isoCode).toBe('NG');
      expect(coords.name).toBe('Nigeria');
    });

    it('resolves coordinates for countries not in presets using country-state-city database', () => {
      // Germany (DE)
      const coords = getCountryCoordinates('Germany');
      expect(coords.isoCode).toBe('DE');
      expect(typeof coords.latitude).toBe('number');
      expect(typeof coords.longitude).toBe('number');
    });

    it('falls back to default South Africa coordinates if unknown', () => {
      const coords = getCountryCoordinates('NonExistentCountryName123', null);
      expect(coords.isoCode).toBe('ZA');
      expect(coords.latitude).toBe(DEFAULT_SOUTH_AFRICA.latitude);
      expect(coords.longitude).toBe(DEFAULT_SOUTH_AFRICA.longitude);
    });
  });
});
