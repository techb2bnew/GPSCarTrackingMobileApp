import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, { Marker, Callout } from 'react-native-maps';
import {
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
} from '../constants/Color';

const AssetMap = () => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      const response = await fetch(
        'https://api.thingspeak.com/channels/2991877/feeds.json?api_key=K9LPDXZ35BKOYFDM&results=1'
      );
      const data = await response.json();
      const latest = data.feeds[0];

      setLocation({
        latitude: parseFloat(latest.field1),
        longitude: parseFloat(latest.field2),
        voltage: latest.field3,
        power: latest.field4,
        timestamp: latest.created_at,
      });
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  return (
    <LinearGradient
      colors={[
        gradientSoftTop,
        gradientSoftMid1,
        gradientSoftMid2,
        gradientSoftMid3,
        gradientSoftMid4,
        gradientSoftBottom,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
          >
            <Callout>
              <View>
                <Text>📍 Asset Location</Text>
                <Text>Voltage: {location.voltage} V</Text>
                <Text>Power: {location.power} W</Text>
                <Text>Time: {new Date(location.timestamp).toLocaleString()}</Text>
              </View>
            </Callout>
          </Marker>
        </MapView>
      )}
    </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default AssetMap;
