import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppModeProvider, useAppMode } from './src/context/AppModeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import NotificationBanner from './src/components/NotificationBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthScreen from './src/screens/shared/AuthScreen';
import FutureVisionScreen from './src/screens/shared/FutureVisionScreen';
import CustomerHomeScreen from './src/screens/customer/CustomerHomeScreen';
import RequestBarberScreen from './src/screens/customer/RequestBarberScreen';
import TrackBarberScreen from './src/screens/customer/TrackBarberScreen';
import PaymentCheckoutScreen from './src/screens/customer/PaymentCheckoutScreen';
import ReviewBarberScreen from './src/screens/customer/ReviewBarberScreen';
import LiveChatScreen from './src/screens/shared/LiveChatScreen';
import NotificationHubScreen from './src/screens/shared/NotificationHubScreen';
import BarberHubScreen from './src/screens/barber/BarberHubScreen';
import HotzoneScreen from './src/screens/barber/HotzoneScreen';
import GrowthEngineScreen from './src/screens/barber/GrowthEngineScreen';

const Stack = createStackNavigator();

function MainNavigator() {
  const { isSignedIn, isRestoring, role } = useAppMode();

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

  if (role === 'barber') {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="BarberHub"
          component={BarberHubScreen}
          options={{ title: 'Barber Dashboard' }}
        />
        <Stack.Screen name="Hotzones" component={HotzoneScreen} options={{ title: 'Busy Areas' }} />
        <Stack.Screen name="GrowthEngine" component={GrowthEngineScreen} options={{ title: 'Promotions' }} />
        <Stack.Screen name="LiveChat" component={LiveChatScreen} options={{ title: 'Live En-Route Chat' }} />
        <Stack.Screen name="NotificationHub" component={NotificationHubScreen} options={{ title: 'Alert Command Center' }} />
        <Stack.Screen name="FutureVision" component={FutureVisionScreen} options={{ title: 'AI Style Studio' }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{ title: 'Book a Barber' }}
      />
      <Stack.Screen name="RequestBarber" component={RequestBarberScreen} options={{ title: 'Request Barber' }} />
      <Stack.Screen name="TrackBarber" component={TrackBarberScreen} options={{ title: 'Live Tracking' }} />
      <Stack.Screen name="PaymentCheckout" component={PaymentCheckoutScreen} options={{ title: 'Payment & Tipping' }} />
      <Stack.Screen name="ReviewBarber" component={ReviewBarberScreen} options={{ title: 'Rate Your Experience' }} />
      <Stack.Screen name="LiveChat" component={LiveChatScreen} options={{ title: 'Live En-Route Chat' }} />
      <Stack.Screen name="NotificationHub" component={NotificationHubScreen} options={{ title: 'Alert Command Center' }} />
      <Stack.Screen name="FutureVision" component={FutureVisionScreen} options={{ title: 'AI Style Studio' }} />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* TrimRide Customer Application Root */}
      <NotificationProvider>
        <AppModeProvider defaultRole="customer">
          <NavigationContainer>
            <MainNavigator />
            <NotificationBanner />
          </NavigationContainer>
        </AppModeProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
