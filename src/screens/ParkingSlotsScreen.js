import React, {useMemo, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform} from 'react-native';
import MapView, {Marker, Polygon} from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {heightPercentageToDP as hp, widthPercentageToDP as wp} from '../utils';
import {style, spacings} from '../constants/Fonts';
import {
  manualParkingSlots,
  parkingSlotPolygons,
  defaultSlotRegion,
} from '../constants/ParkingSlotPolygons';

const COLOR_PRIMARY = '#FF6F61';
const COLOR_FILL = 'rgba(255, 111, 97, 0.25)';
const COLOR_STROKE = '#FF6F61';

const getSlotCentroid = coordinates => {
  if (!coordinates?.length) {
    return defaultSlotRegion;
  }

  const {latitude, longitude} = coordinates.reduce(
    (accumulator, point) => ({
      latitude: accumulator.latitude + point.latitude,
      longitude: accumulator.longitude + point.longitude,
    }),
    {latitude: 0, longitude: 0},
  );

  const count = coordinates.length;

  return {
    latitude: latitude / count,
    longitude: longitude / count,
  };
};

const getRegionFromPolygons = (polygons, fallbackRegion) => {
  if (!polygons.length) {
    return fallbackRegion;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  polygons.forEach(slot => {
    slot.coordinates?.forEach(point => {
      if (typeof point?.latitude === 'number' && typeof point?.longitude === 'number') {
        minLat = Math.min(minLat, point.latitude);
        maxLat = Math.max(maxLat, point.latitude);
        minLng = Math.min(minLng, point.longitude);
        maxLng = Math.max(maxLng, point.longitude);
      }
    });
  });

  if (!isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
    return fallbackRegion;
  }

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;

  // Minimal padding (1.1x) for maximum zoom - just enough to see all polygons
  const latDelta = Math.max((maxLat - minLat) * 1.1, 0.0003);
  const lonDelta = Math.max((maxLng - minLng) * 1.1, 0.0003);

  return {
    latitude,
    longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
};

const ParkingSlotsScreen = ({navigation}) => {
  const mapRef = useRef(null);

  const sortedPolygons = useMemo(
    () =>
      [...parkingSlotPolygons].sort((a, b) => {
        const slotA = typeof a?.slot === 'number' ? a.slot : Number(a?.slot || 0);
        const slotB = typeof b?.slot === 'number' ? b.slot : Number(b?.slot || 0);
        return slotA - slotB;
      }),
    [],
  );

  const slotMarkers = useMemo(
    () =>
      sortedPolygons.map(slot => ({
        label: slot?.name || (slot?.slot ? `${slot.slot}` : 'Polygon'),
        centroid: getSlotCentroid(slot.coordinates),
      })),
    [sortedPolygons],
  );

  const firstSlotRegion = useMemo(() => {
    if (!sortedPolygons.length) {
      return defaultSlotRegion;
    }

    return getRegionFromPolygons(sortedPolygons, defaultSlotRegion);
  }, [sortedPolygons]);

  // Zoom to fit all polygons when map is ready
  useEffect(() => {
    if (mapRef.current && firstSlotRegion) {
      // Small delay to ensure map is fully rendered
      const timer = setTimeout(() => {
        mapRef.current?.animateToRegion(firstSlotRegion, 1000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [firstSlotRegion]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={26} color="#000" />
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <Text style={styles.title}>Parking Slots Overview</Text>
        <Text style={styles.subtitle}>
          Slot polygons rendered from provided coordinates
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={firstSlotRegion}
        mapType="satellite"
        onMapReady={() => {
          // Zoom to fit all polygons when map is ready
          if (mapRef.current && firstSlotRegion) {
            setTimeout(() => {
              mapRef.current?.animateToRegion(firstSlotRegion, 1000);
            }, 300);
          }
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}>
        {sortedPolygons.map(slot => (
          <Polygon
            key={slot.name ?? slot.slot}
            coordinates={slot.coordinates}
            strokeColor={COLOR_STROKE}
            fillColor={COLOR_FILL}
            strokeWidth={1}
          />
        ))}

        {slotMarkers.map(slot => (
          <Marker key={slot.label} coordinate={slot.centroid} anchor={{x: 0.5, y: 0.5}}>
            <View style={styles.slotBadge}>
              {/* <Text style={styles.slotBadgeText}>{slot.label}</Text> */}
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: wp(3),
    top: Platform.OS === 'ios' ? hp(6) : hp(2),
    zIndex: 10,
    height: wp(12),
    width: wp(12),
    borderRadius: wp(6),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? hp(12) : hp(8),
    paddingHorizontal: wp(6),
    paddingBottom: spacings.large,
    backgroundColor: '#fff',
    zIndex: 5,
  },
  title: {
    fontSize: style.fontSizeLarge2x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#111',
  },
  subtitle: {
    marginTop: spacings.small,
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  slotBadge: {
    backgroundColor: COLOR_PRIMARY,
    paddingHorizontal: spacings.small,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: '#fff',
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: style.fontSizeSmall1x.fontSize,
  },
});

export default ParkingSlotsScreen;

