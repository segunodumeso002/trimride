import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { colors } from '../../theme/tokens';

export default function HotzoneScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -26.2041,
          longitude: 28.0473,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        <Circle
          center={{ latitude: -26.2, longitude: 28.04 }}
          radius={1900}
          strokeWidth={2}
          strokeColor="rgba(198,146,20,0.85)"
          fillColor="rgba(198,146,20,0.25)"
        />
      </MapView>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>High-demand area: +22% request boost expected</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: colors.ink,
    borderRadius: 12,
    padding: 14,
  },
  bannerText: { color: colors.white, fontWeight: '700' },
});
