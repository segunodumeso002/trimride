import { Country } from 'country-state-city';
import parsePhoneNumberFromString from 'libphonenumber-js/max';

// Known representative center coordinates and delta for common regions
export const PRESET_COUNTRY_COORDINATES = {
  ZA: { latitude: -28.4793, longitude: 24.6727, latitudeDelta: 6.5, longitudeDelta: 6.5, name: 'South Africa', flag: '🇿🇦' },
  NG: { latitude: 9.0820, longitude: 8.6753, latitudeDelta: 5.5, longitudeDelta: 5.5, name: 'Nigeria', flag: '🇳🇬' },
  GH: { latitude: 7.9465, longitude: -1.0232, latitudeDelta: 4.5, longitudeDelta: 4.5, name: 'Ghana', flag: '🇬🇭' },
  US: { latitude: 37.0902, longitude: -95.7129, latitudeDelta: 16.0, longitudeDelta: 16.0, name: 'United States', flag: '🇺🇸' },
  GB: { latitude: 55.3781, longitude: -3.4360, latitudeDelta: 6.0, longitudeDelta: 6.0, name: 'United Kingdom', flag: '🇬🇧' },
  KE: { latitude: 0.0236, longitude: 37.9062, latitudeDelta: 5.0, longitudeDelta: 5.0, name: 'Kenya', flag: '🇰🇪' },
  ZW: { latitude: -19.0154, longitude: 29.1549, latitudeDelta: 5.0, longitudeDelta: 5.0, name: 'Zimbabwe', flag: '🇿🇼' },
  BW: { latitude: -22.3285, longitude: 24.6849, latitudeDelta: 6.0, longitudeDelta: 6.0, name: 'Botswana', flag: '🇧🇼' },
  NA: { latitude: -22.9576, longitude: 18.4904, latitudeDelta: 7.0, longitudeDelta: 7.0, name: 'Namibia', flag: '🇳🇦' },
  CA: { latitude: 56.1304, longitude: -106.3468, latitudeDelta: 18.0, longitudeDelta: 18.0, name: 'Canada', flag: '🇨🇦' },
  AU: { latitude: -25.2744, longitude: 133.7751, latitudeDelta: 16.0, longitudeDelta: 16.0, name: 'Australia', flag: '🇦🇺' },
};

export const DEFAULT_SOUTH_AFRICA = PRESET_COUNTRY_COORDINATES.ZA;

export function resolveCountryCode(countryNameOrCode, phone) {
  if (countryNameOrCode && typeof countryNameOrCode === 'string') {
    const trimmed = countryNameOrCode.trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'USA' || upper === 'UNITED STATES OF AMERICA' || upper === 'UNITED STATES') return 'US';
    if (upper === 'UK' || upper === 'GREAT BRITAIN' || upper === 'UNITED KINGDOM') return 'GB';
    if (upper === 'GHANA') return 'GH';
    if (upper === 'NIGERIA') return 'NG';
    if (upper === 'SOUTH AFRICA') return 'ZA';
    if (upper === 'KENYA') return 'KE';
    if (upper === 'ZIMBABWE') return 'ZW';
    if (upper === 'BOTSWANA') return 'BW';
    if (upper === 'NAMIBIA') return 'NA';
    if (upper === 'CANADA') return 'CA';
    if (upper === 'AUSTRALIA') return 'AU';

    if (trimmed.length === 2) {
      return upper;
    }

    try {
      const allCountries = (typeof Country?.getAllCountries === 'function')
        ? Country.getAllCountries()
        : [];
      const match = allCountries.find(
        c => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (match?.isoCode) {
        return match.isoCode;
      }
    } catch (_) {}
  }

  if (phone && typeof phone === 'string') {
    try {
      const parsed = parsePhoneNumberFromString(phone);
      if (parsed?.country) {
        return parsed.country;
      }
    } catch (_) {}
  }

  return 'ZA';
}

export function getCountryCoordinates(countryNameOrCode, phone) {
  const isoCode = resolveCountryCode(countryNameOrCode, phone);

  if (isoCode && PRESET_COUNTRY_COORDINATES[isoCode]) {
    return { ...PRESET_COUNTRY_COORDINATES[isoCode], isoCode };
  }

  if (isoCode) {
    try {
      const country = (typeof Country?.getCountryByCode === 'function')
        ? Country.getCountryByCode(isoCode)
        : null;
      if (country && country.latitude && country.longitude) {
        return {
          latitude: Number(country.latitude),
          longitude: Number(country.longitude),
          latitudeDelta: 6.0,
          longitudeDelta: 6.0,
          name: country.name,
          flag: country.flag || '',
          isoCode,
        };
      }
    } catch (_) {}
  }

  return { ...DEFAULT_SOUTH_AFRICA, isoCode: 'ZA' };
}
