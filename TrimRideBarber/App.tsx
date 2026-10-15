import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppModeProvider, useAppMode } from './src/context/AppModeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import NotificationBanner from './src/components/NotificationBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthScreen from './src/screens/shared/AuthScreen';
import FutureVisionScreen from './src/screens/shared/FutureVisionScreen';
import BarberHubScreen from './src/screens/barber/BarberHubScreen';
import HotzoneScreen from './src/screens/barber/HotzoneScreen';
import GrowthEngineScreen from './src/screens/barber/GrowthEngineScreen';
import LiveChatScreen from './src/screens/shared/LiveChatScreen';
import NotificationHubScreen from './src/screens/shared/NotificationHubScreen';
import BarberEarningsScreen from './src/screens/barber/BarberEarningsScreen';

const Stack = createStackNavigator();

function MainNavigator() {
  const { isSignedIn, isRestoring } = useAppMode();

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BarberHub"
        component={BarberHubScreen}
        options={{ title: 'TrimRide Barber' }}
      />
      <Stack.Screen name="Hotzones" component={HotzoneScreen} options={{ title: 'Demand Hotzones' }} />
      <Stack.Screen name="GrowthEngine" component={GrowthEngineScreen} options={{ title: 'Growth Engine' }} />
      <Stack.Screen name="LiveChat" component={LiveChatScreen} options={{ title: 'Live En-Route Chat' }} />
      <Stack.Screen name="BarberEarnings" component={BarberEarningsScreen} options={{ title: 'Earnings & Royalties' }} />
      <Stack.Screen name="NotificationHub" component={NotificationHubScreen} options={{ title: 'Alert Command Center' }} />
      <Stack.Screen name="FutureVision" component={FutureVisionScreen} options={{ title: 'AI Style Studio' }} />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        {/* TrimRide Barber Application Root */}
        <NotificationProvider>
          <AppModeProvider defaultRole="barber">
            <NavigationContainer>
              <MainNavigator />
              <NotificationBanner />
            </NavigationContainer>
          </AppModeProvider>
        </NotificationProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
