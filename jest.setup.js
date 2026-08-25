import 'react-native-gesture-handler/jestSetup';

/* global jest */

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMap = props => React.createElement(View, props, props.children);

  return {
    __esModule: true,
    default: MockMap,
    Marker: MockMap,
    Circle: MockMap,
  };
});

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success, _error) => {
    success({ coords: { latitude: -26.2041, longitude: 28.0473 } });
  }),
}));

jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({ children }) => children,
  };
});

jest.mock('@react-navigation/stack', () => {
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => children,
      Screen: () => null,
    }),
  };
});
