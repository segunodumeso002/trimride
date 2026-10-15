/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { useAppMode } from '../src/context/AppModeContext';

jest.mock('../src/context/AppModeContext', () => ({
  AppModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useAppMode: jest.fn(),
}));

jest.mock('../src/context/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotifications: () => ({
    items: [],
    history: [],
    addNotification: jest.fn(),
    clearHistory: jest.fn(),
    soundEnabled: true,
    setSoundEnabled: jest.fn(),
    vibrationEnabled: true,
    setVibrationEnabled: jest.fn(),
  }),
}));

jest.mock('../src/screens/shared/AuthScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_AUTH');
});

jest.mock('../src/screens/barber/BarberHubScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_BARBER_HUB');
});

jest.mock('../src/screens/barber/HotzoneScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_HOTZONES');
});

jest.mock('../src/screens/barber/GrowthEngineScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_GROWTH_ENGINE');
});

jest.mock('../src/screens/barber/BarberEarningsScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_BARBER_EARNINGS');
});

jest.mock('../src/screens/shared/LiveChatScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_LIVE_CHAT');
});

jest.mock('../src/screens/shared/NotificationHubScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_NOTIFICATION_HUB');
});

jest.mock('../src/screens/shared/FutureVisionScreen', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return () => ReactLocal.createElement(Text, null, 'MOCK_FUTURE_VISION');
});

const mockedUseAppMode = useAppMode as unknown as jest.Mock;

async function renderAsText() {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });

  return JSON.stringify(tree!.toJSON());
}

describe('TrimRide Barber App navigation & routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows signed-out auth screen when not logged in', async () => {
    mockedUseAppMode.mockReturnValue({
      isSignedIn: false,
      isRestoring: false,
      role: null,
    });

    const output = await renderAsText();
    expect(output).toContain('MOCK_AUTH');
  });

  test('shows barber stack when signed in as barber', async () => {
    mockedUseAppMode.mockReturnValue({
      isSignedIn: true,
      isRestoring: false,
      role: 'barber',
      token: 'mock-token',
      user: { id: 1, email: 'barber@trimride.app' },
      signOut: jest.fn(),
    });

    const output = await renderAsText();
    expect(output).toContain('MOCK_BARBER_HUB');
    expect(output).toContain('MOCK_HOTZONES');
    expect(output).toContain('MOCK_GROWTH_ENGINE');
    expect(output).toContain('MOCK_BARBER_EARNINGS');
  });
});
