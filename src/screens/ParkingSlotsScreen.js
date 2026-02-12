import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from '../utils';
import { style, spacings } from '../constants/Fonts';
import {
  parkingSlotPolygons,
  threeParkingSlots,
  ParkingSlotsOne,
  ParkingSlotsTwo,
  defaultSlotRegion,
  // indianSlotRegion, // COMMENTED - Indian slots not showing
  // indianDefaultSlotRegion,
} from '../constants/ParkingSlotPolygons';
import LinearGradient from 'react-native-linear-gradient';
import {
  blackColor,
  whiteColor,
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
} from '../constants/Color';

const COLOR_PRIMARY = '#FF6F61';
const COLOR_FILL = 'rgba(255, 111, 97, 0.25)';
const COLOR_STROKE = '#FF6F61';

const getSlotCentroid = coordinates => {
  if (!coordinates?.length) {
    return defaultSlotRegion;
  }

  const { latitude, longitude } = coordinates.reduce(
    (accumulator, point) => ({
      latitude: accumulator.latitude + point.latitude,
      longitude: accumulator.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
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

const ParkingSlotsScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  // Commented out Indian Slot Region - NOT showing Indian slots
  // const sortedPolygons = useMemo(
  //   () =>
  //     [...indianSlotRegion].sort((a, b) => {
  //       const slotA = typeof a?.slot === 'number' ? a.slot : Number(a?.slot || 0);
  //       const slotB = typeof b?.slot === 'number' ? b.slot : Number(b?.slot || 0);
  //       return slotA - slotB;
  //     }),
  //   [],
  // );

  // Combine all slots except Indian - parkingSlotPolygons, threeParkingSlots, ParkingSlotsOne, ParkingSlotsTwo
  const sortedPolygons = useMemo(
    () => {
      const allSlots = [
        ...parkingSlotPolygons,
        ...threeParkingSlots,
        ...ParkingSlotsOne,
        ...ParkingSlotsTwo,
      ];
      return allSlots.sort((a, b) => {
        const slotA = typeof a?.slot === 'number' ? a.slot : Number(a?.slot || 0);
        const slotB = typeof b?.slot === 'number' ? b.slot : Number(b?.slot || 0);
        return slotA - slotB;
      });
    },
    [],
  );

  const slotMarkers = useMemo(
    () =>
      sortedPolygons.map(slot => ({
        label: slot?.name || (slot?.slot ? `${slot.slot}` : 'Polygon'),
        centroid: getSlotCentroid(slot.coordinates),
        slot: slot,
      })),
    [sortedPolygons],
  );

  const firstSlotRegion = useMemo(() => {
    // Calculate region from all polygons (except Indian)
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
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={30} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Parking Slots Overview</Text>
        </View>
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
        showsMyLocationButton={false}
        zoomEnabled={true}
        zoomControlEnabled={true}
        minZoomLevel={1}
        maxZoomLevel={100}
        scrollEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {/* Indian Slot Region - COMMENTED OUT - Not showing */}
        {/* {indianSlotRegion.map(slot => (
          <Polygon
            key={slot.slot_id ?? slot.slot}
            coordinates={slot.coordinates}
            strokeColor={COLOR_STROKE}
            fillColor={COLOR_FILL}
            strokeWidth={2}
          />
        ))} */}

        {/* Main Parking Slots - parkingSlotPolygons */}
        {parkingSlotPolygons.map(slot => (
          <Polygon
            key={slot.name ?? slot.slot}
            coordinates={slot.coordinates}
            strokeColor={COLOR_STROKE}
            fillColor={COLOR_FILL}
            strokeWidth={1}
          />
        ))}

        {/* Three Parking Slots - with blue color */}
        {threeParkingSlots.map(slot => (
          <Polygon
            key={`three-slot-${slot.slot}`}
            coordinates={slot.coordinates}
            strokeColor="#0066FF"
            fillColor="rgba(0, 102, 255, 0.4)"
            strokeWidth={2}
          />
        ))}

        {/* Single Parking Slots One */}
        {ParkingSlotsOne.map((slot, index) => (
          <Polygon
            key={`single-slot-one-${index}`}
            coordinates={slot.coordinates}
            strokeColor="#FF6F61"
            fillColor="rgba(255, 111, 97, 0.25)"
            strokeWidth={2}
          />
        ))}

        {/* Single Parking Slots Two */}
        {ParkingSlotsTwo.map((slot, index) => (
          <Polygon
            key={`single-slot-two-${index}`}
            coordinates={slot.coordinates}
            strokeColor="#FF6F61"
            fillColor="rgba(255, 111, 97, 0.25)"
            strokeWidth={2}
          />
        ))}

        {/* Indian Slot Region Markers - COMMENTED OUT - Not showing */}
        {/* {indianSlotRegion.map(slot => {
          const centroid = getSlotCentroid(slot.coordinates);
          return (
            <Marker
              key={slot.slot_id ?? slot.slot}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <TouchableOpacity
                style={styles.slotBadge}
                activeOpacity={0.7}
              >
                <Text style={styles.slotBadgeText}>{slot.slot}</Text>
              </TouchableOpacity>
            </Marker>
          );
        })} */}

        {/* Main Parking Slots Markers - parkingSlotPolygons */}
        {parkingSlotPolygons.map(slot => {
          const centroid = getSlotCentroid(slot.coordinates);
          return (
            <Marker
              key={slot.name ?? slot.slot}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <TouchableOpacity
                style={styles.slotBadge}
                activeOpacity={0.7}
              >
                <Text style={styles.slotBadgeText}>{slot.slot}</Text>
              </TouchableOpacity>
            </Marker>
          );
        })}

        {/* Three Parking Slots Markers */}
        {threeParkingSlots.map(slot => {
          const centroid = getSlotCentroid(slot.coordinates);
          return (
            <Marker
              key={`three-marker-${slot.slot}`}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <TouchableOpacity
                style={[styles.slotBadge, { backgroundColor: 'rgba(0, 102, 255, 0.3)' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotBadgeText]}>{slot.slot}</Text>
              </TouchableOpacity>
            </Marker>
          );
        })}

        {/* Single Parking Slots One Markers */}
        {ParkingSlotsOne.map((slot, index) => {
          const centroid = getSlotCentroid(slot.coordinates);
          return (
            <Marker
              key={`single-marker-one-${index}`}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <TouchableOpacity
                style={[styles.slotBadge]}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotBadgeText]}>
                  {slot.name || `S1-${index + 1}`}
                </Text>
              </TouchableOpacity>
            </Marker>
          );
        })}

        {/* Single Parking Slots Two Markers */}
        {ParkingSlotsTwo.map((slot, index) => {
          const centroid = getSlotCentroid(slot.coordinates);
          return (
            <Marker
              key={`single-marker-two-${index}`}
              coordinate={centroid}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <TouchableOpacity
                style={[styles.slotBadge]}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotBadgeText]}>
                  {slot.name || `S2-${index + 1}`}
                </Text>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>
    </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: whiteColor,
    paddingTop: Platform.OS === 'ios' ? hp(6) : hp(3),
    paddingHorizontal: spacings.large,
    paddingBottom: spacings.medium,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 5,
  },
  backButton: {
    padding: spacings.small,
    marginRight: spacings.large,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: '#111',
    ...style,
  },
  subtitle: {
    marginTop: spacings.xxsmall,
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    ...style,
  },
  map: {
    flex: 1,
  },
  slotBadge: {
    // backgroundColor: COLOR_PRIMARY,
    paddingHorizontal: spacings.small,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: blackColor,
    fontWeight: style.fontWeightBold.fontWeight,
    fontSize: 6.5,
  },
});

export default ParkingSlotsScreen;

