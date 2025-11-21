import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../lib/supabaseClient';
import { heightPercentageToDP as hp } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { blackColor, whiteColor } from '../constants/Color';

const COLOR_PRIMARY = '#FF6F61';
const COLOR_FILL = 'rgba(255, 111, 97, 0.25)';
const COLOR_STROKE = '#FF6F61';

// Get centroid of polygon for marker placement
const getPolygonCentroid = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        return null;
    }

    const validCoords = coordinates.filter(
        coord => coord && typeof coord.lat === 'number' && typeof coord.lng === 'number'
    );

    if (validCoords.length === 0) {
        return null;
    }

    const { lat, lng } = validCoords.reduce(
        (accumulator, point) => ({
            lat: accumulator.lat + point.lat,
            lng: accumulator.lng + point.lng,
        }),
        { lat: 0, lng: 0 },
    );

    return {
        latitude: lat / validCoords.length,
        longitude: lng / validCoords.length,
    };
};

// Get map region from polygons
const getRegionFromPolygons = (polygons) => {
    if (!polygons || polygons.length === 0) {
        return {
            latitude: 0,
            longitude: 0,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;

    polygons.forEach(polygon => {
        if (polygon.coordinates && Array.isArray(polygon.coordinates)) {
            polygon.coordinates.forEach(point => {
                if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
                    minLat = Math.min(minLat, point.lat);
                    maxLat = Math.max(maxLat, point.lat);
                    minLng = Math.min(minLng, point.lng);
                    maxLng = Math.max(maxLng, point.lng);
                }
            });
        }
    });

    if (!isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
        return {
            latitude: 0,
            longitude: 0,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.2, 0.001);
    const lonDelta = Math.max((maxLng - minLng) * 1.2, 0.001);

    return {
        latitude,
        longitude,
        latitudeDelta: latDelta,
        longitudeDelta: lonDelta,
    };
};

// Convert coordinates from {lat, lng} to {latitude, longitude} format for MapView
const convertCoordinates = (coordinates) => {
    if (!coordinates || !Array.isArray(coordinates)) {
        return [];
    }
    return coordinates.map(coord => ({
        latitude: coord.lat || coord.latitude,
        longitude: coord.lng || coord.longitude,
    }));
};

// Geocode address string to get lat/long using Google Geocoding API
const geocodeAddress = async (address) => {
    try {
        if (!address || address.trim() === '') {
            console.log('⚠️ [Geocoding] Empty address provided');
            return null;
        }

        const API_KEY = 'AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI';
        const encodedAddress = encodeURIComponent(address.trim());
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}`;

        console.log('🔄 [Geocoding] Fetching coordinates for address:', address);
        console.log('🔄 [Geocoding] URL:', url);

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            const result = {
                lat: location.lat,
                lng: location.lng,
            };
            console.log('✅ [Geocoding] Success:', result);
            return result;
        } else {
            console.log('❌ [Geocoding] Error:', data.status, data.error_message || '');
            return null;
        }
    } catch (error) {
        console.error('❌ [Geocoding] Exception:', error);
        return null;
    }
};

const YardPolygonsMapScreen = ({ navigation, route }) => {
    const { yardId, yardName, yardAddress } = route.params || {};
    const mapRef = useRef(null);
    const [polygons, setPolygons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [defaultRegion, setDefaultRegion] = useState({
        latitude: 28.6139,
        longitude: 77.2090,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    // Fetch polygons from facility_polygons table
    const loadPolygons = async () => {
        try {
            setLoading(true);
            console.log('🔄 [YardPolygonsMapScreen] Loading polygons for yard:', yardId);

            if (!yardId) {
                setPolygons([]);
                setLoading(false);
                return;
            }

            // Fetch polygons from facility_polygons table filtered by facility_id
            // Convert yardId to integer for proper matching (facility_id is int8)
            const facilityIdInt = parseInt(yardId, 10);

            const { data, error: fetchError } = await supabase
                .from('facility_polygons')
                .select('*')
                .eq('facility_id', facilityIdInt)
                .order('slot_number', { ascending: true });

            if (fetchError) {
                console.error('❌ [YardPolygonsMapScreen] Error fetching polygons:', fetchError);
                setPolygons([]);
                setLoading(false);
                return;
            }

            console.log('✅ [YardPolygonsMapScreen] Fetched polygons:', data?.length || 0);

            // Process and validate polygons
            const processedPolygons = (data || []).map(item => {
                let coordinates = [];

                // Handle coordinates - can be JSON string or already parsed
                if (typeof item.coordinates === 'string') {
                    try {
                        coordinates = JSON.parse(item.coordinates);
                    } catch (e) {
                        console.error('Error parsing coordinates:', e);
                        coordinates = [];
                    }
                } else if (Array.isArray(item.coordinates)) {
                    coordinates = item.coordinates;
                }

                return {
                    id: item.id,
                    facilityId: item.facility_id,
                    slotNum: item.slot_number || item.slot_num || item.slotNum || 'N/A',
                    coordinates: coordinates,
                };
            }).filter(poly => poly.coordinates && poly.coordinates.length > 0);

            setPolygons(processedPolygons);
            console.log('📊 [YardPolygonsMapScreen] Processed polygons:', processedPolygons.length);

            // Geocode address to get lat/long for map region
            // Priority: 1. Passed address (yardAddress from YardListScreen) 2. Facility table lat/long 3. Facility table address
            try {
                let mapLat = null;
                let mapLng = null;
                
                // First priority: Use address passed from YardListScreen
                if (yardAddress && yardAddress.trim() !== '') {
                    console.log('📍 [YardPolygonsMapScreen] Geocoding passed address:', yardAddress);
                    const geocodeResult = await geocodeAddress(yardAddress);
                    
                    if (geocodeResult) {
                        mapLat = geocodeResult.lat;
                        mapLng = geocodeResult.lng;
                        console.log('✅ [YardPolygonsMapScreen] Geocoded passed address to:', { lat: mapLat, lng: mapLng });
                    }
                }
                
                // Second priority: Try facility table lat/long if address geocoding failed
                if (!mapLat || !mapLng) {
                    const facilityIdForQuery = parseInt(yardId, 10);
                    const { data: facilityData, error: facilityError } = await supabase
                        .from('facility')
                        .select('address, lat, long')
                        .eq('id', facilityIdForQuery)
                        .single();

                    if (!facilityError && facilityData) {
                        console.log('📍 [YardPolygonsMapScreen] Facility data:', facilityData);
                        
                        // Check if lat and long are directly available
                        if (facilityData.lat && facilityData.long) {
                            const lat = parseFloat(facilityData.lat);
                            const lng = parseFloat(facilityData.long);
                            
                            if (!isNaN(lat) && !isNaN(lng)) {
                                mapLat = lat;
                                mapLng = lng;
                                console.log('✅ [YardPolygonsMapScreen] Using direct lat/long from facility:', { lat, lng });
                            }
                        }
                        
                        // If lat/long not available, geocode facility table address
                        if ((!mapLat || !mapLng) && facilityData.address) {
                            console.log('🔄 [YardPolygonsMapScreen] Geocoding facility address:', facilityData.address);
                            const geocodeResult = await geocodeAddress(facilityData.address);
                            
                            if (geocodeResult) {
                                mapLat = geocodeResult.lat;
                                mapLng = geocodeResult.lng;
                                console.log('✅ [YardPolygonsMapScreen] Geocoded facility address to:', { lat: mapLat, lng: mapLng });
                            }
                        }
                    } else {
                        console.log('❌ [YardPolygonsMapScreen] Error fetching facility:', facilityError);
                    }
                }
                
                // Set map region if we have coordinates
                if (mapLat && mapLng) {
                    setDefaultRegion({
                        latitude: mapLat,
                        longitude: mapLng,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                    console.log('✅ [YardPolygonsMapScreen] Map region set to:', { latitude: mapLat, longitude: mapLng });
                } else {
                    console.log('⚠️ [YardPolygonsMapScreen] Could not get location from address, using default');
                }
            } catch (facilityErr) {
                console.error('❌ [YardPolygonsMapScreen] Error getting facility location:', facilityErr);
            }

        } catch (err) {
            console.error('❌ [YardPolygonsMapScreen] Error loading polygons:', err);
            setPolygons([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolygons();
    }, [yardId]);

    // Calculate map region from polygons or use facility location
    const mapRegion = useMemo(() => {
        if (polygons.length > 0) {
            // If polygons exist, calculate region from polygons
            const polygonRegion = getRegionFromPolygons(polygons);
            // Only use polygon region if it's valid (has coordinates)
            if (polygonRegion.latitude !== 0 && polygonRegion.longitude !== 0) {
                return polygonRegion;
            }
        }
        // Use facility location (defaultRegion) if no polygons or invalid polygon region
        return defaultRegion;
    }, [polygons, defaultRegion]);

    // Zoom to fit all polygons when map is ready
    useEffect(() => {
        if (mapRef.current && mapRegion.latitude !== 0) {
            const timer = setTimeout(() => {
                mapRef.current?.animateToRegion(mapRegion, 1000);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [polygons, mapRegion]);

    // Create markers for slot numbers
    const slotMarkers = useMemo(() => {
        return polygons.map(polygon => {
            const centroid = getPolygonCentroid(polygon.coordinates);
            if (!centroid) return null;

            return {
                id: polygon.id,
                slotNum: polygon.slotNum,
                coordinate: {
                    latitude: centroid.latitude,
                    longitude: centroid.longitude,
                },
            };
        }).filter(Boolean);
    }, [polygons]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={30} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>{yardName || 'Yard Map'}</Text>
                    <Text style={styles.subtitle}>
                        {loading ? 'Loading...' : polygons.length > 0 ? `${polygons.length} parking slots` : 'No parking slots'}
                    </Text>
                </View>
            </View>

            {/* Map - Always shown */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={mapRegion}
                    mapType="satellite"
                    onMapReady={() => {
                        if (mapRef.current && mapRegion.latitude !== 0) {
                            setTimeout(() => {
                                mapRef.current?.animateToRegion(mapRegion, 1000);
                            }, 300);
                        }
                    }}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    zoomEnabled={true}
                    scrollEnabled={true}
                    pitchEnabled={false}
                    rotateEnabled={false}
                >
                    {/* Render Polygons */}
                    {polygons.map((polygon) => {
                        const convertedCoords = convertCoordinates(polygon.coordinates);
                        if (convertedCoords.length === 0) return null;

                        return (
                            <Polygon
                                key={polygon.id}
                                coordinates={convertedCoords}
                                strokeColor={COLOR_STROKE}
                                fillColor={COLOR_FILL}
                                strokeWidth={2}
                            />
                        );
                    })}

                    {/* Render Slot Number Markers */}
                    {slotMarkers.map((marker) => (
                        <Marker
                            key={marker.id}
                            coordinate={marker.coordinate}
                        >
                            <Text style={styles.slotBadgeText}>{marker.slotNum}</Text>
                        </Marker>
                    ))}
                </MapView>

                {/* Loading Overlay */}
                {loading && (
                    <View style={styles.overlayContainer}>
                        <View style={styles.overlayContent}>
                            <ActivityIndicator size="large" color={COLOR_PRIMARY} />
                            <Text style={styles.overlayText}>Loading polygons...</Text>
                        </View>
                    </View>
                )}

                {/* No Polygons Message Toast - Top */}
                {!loading && polygons.length === 0 && (
                    <View style={styles.noPolygonsNote}>
                        <Ionicons name="information-circle" size={18} color="#FF6F61" style={styles.noPolygonsIcon} />
                        <Text style={styles.noPolygonsText}>
                            No parking slots available in this yard yet
                        </Text>
                    </View>
                )}
            </View>
        </View>
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
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    overlayContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: spacings.xLarge,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    overlayText: {
        marginTop: spacings.normal,
        fontSize: style.fontSizeNormal.fontSize,
        color: '#666',
        fontWeight: style.fontWeightMedium.fontWeight,
    },
    noPolygonsNote: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        backgroundColor: '#FFF5F5',
        padding: spacings.small2x,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE5E5',
        zIndex: 1000,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noPolygonsIcon: {
        marginRight: spacings.small,
    },
    noPolygonsText: {
        color: '#FF6F61',
        fontSize: style.fontSizeSmall1x.fontSize,
        fontWeight: style.fontWeightMedium.fontWeight,
        textAlign: 'center',
        flex: 1,
    },
    slotBadgeText: {
        color: blackColor,
        fontWeight: style.fontWeightBold.fontWeight,
        fontSize: 10,
    },
});

export default YardPolygonsMapScreen;

