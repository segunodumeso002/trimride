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

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    hasPermission: jest.fn(() => Promise.resolve(1)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('mock-token-123')),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  });
});

jest.mock('react-native-sound-player', () => ({
  playSoundFile: jest.fn(),
  playUrl: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}), { virtual: true });

jest.mock('react-native-skeleton-placeholder', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSkeleton = props => React.createElement(View, props, props.children);
  MockSkeleton.Item = props => React.createElement(View, props, props.children);
  return MockSkeleton;
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return props => React.createElement(View, props, props.children);
});

jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({ children }) => children,
  };
});

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return props => React.createElement(Text, props, props.name || 'feather-icon');
});

jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return props => React.createElement(Text, props, props.name || 'material-icon');
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return props => React.createElement(Text, props, props.name || 'ionicons-icon');
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');

  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => children,
      Screen: ({ component: Component, route = { params: {} } }) => {
        if (!Component) {
          return null;
        }

        const navigation = {
          navigate: jest.fn(),
          goBack: jest.fn(),
        };

        return React.createElement(Component, { navigation, route });
      },
    }),
  };
});
