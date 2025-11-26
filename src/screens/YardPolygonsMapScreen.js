import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Modal, Dimensions, Image } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../lib/supabaseClient';
import { heightPercentageToDP as hp } from '../utils';
import { spacings, style } from '../constants/Fonts';
import { blackColor, whiteColor } from '../constants/Color';
import mqtt from "mqtt/dist/mqtt";
import { getMQTTConfig } from '../constants/Constants';
import { useFocusEffect } from '@react-navigation/native';

const COLOR_PRIMARY = '#FF6F61';
const COLOR_FILL = 'rgba(255, 111, 97, 0.25)';
const COLOR_STROKE = '#FF6F61';

const { width, height } = Dimensions.get('window');

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

    // Vehicle states
    const [vehicles, setVehicles] = useState([]);
    const [vehicleLocations, setVehicleLocations] = useState({}); // { chipId: { latitude, longitude, lastUpdate } }
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [mqttClient, setMqttClient] = useState(null);
    const [mqttConnected, setMqttConnected] = useState(false);
    
    // Buffer for MQTT lat/lon data per chip
    const mqttBufferRef = useRef({}); // { chipId: { lat: null, lon: null } }

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

    // Load vehicles from database for this facility
    const loadVehicles = async () => {
        try {
            if (!yardId) return;

            console.log('🚗 [YardPolygonsMapScreen] Loading vehicles for facility:', yardId);
            const facilityIdInt = parseInt(yardId, 10);

            const { data, error } = await supabase
                .from('cars')
                .select('*')
                .eq('facilityId', facilityIdInt);

            if (error) {
                console.error('❌ [YardPolygonsMapScreen] Error loading vehicles:', error);
                return;
            }

            console.log(`✅ [YardPolygonsMapScreen] Loaded ${data?.length || 0} vehicles`);

            // Filter vehicles that have chips assigned
            const vehiclesWithChips = (data || []).filter(v => v.chip && v.chip.trim() !== '');
            
            // Set vehicles
            setVehicles(vehiclesWithChips);

            // Initialize locations from database for vehicles that have location data
            const initialLocations = {};
            vehiclesWithChips.forEach(vehicle => {
                if (vehicle.latitude && vehicle.longitude && vehicle.chip) {
                    initialLocations[vehicle.chip] = {
                        latitude: parseFloat(vehicle.latitude),
                        longitude: parseFloat(vehicle.longitude),
                        lastUpdate: vehicle.last_location_update || null,
                        vin: vehicle.vin,
                        chipId: vehicle.chip
                    };
                }
            });
            setVehicleLocations(initialLocations);
            console.log(`📍 [YardPolygonsMapScreen] Initialized ${Object.keys(initialLocations).length} vehicle locations from database`);

        } catch (error) {
            console.error('❌ [YardPolygonsMapScreen] Error loading vehicles:', error);
        }
    };

    // Initialize MQTT for all chips in the facility
    const initializeMqtt = () => {
        try {
            if (vehicles.length === 0) {
                console.log('⚠️ [YardPolygonsMapScreen] No vehicles with chips to monitor');
                return;
            }

            // Get all chip IDs
            const chipIds = vehicles
                .filter(v => v.chip && v.chip.trim() !== '')
                .map(v => v.chip);

            if (chipIds.length === 0) {
                console.log('⚠️ [YardPolygonsMapScreen] No chip IDs found');
                return;
            }

            console.log(`🔌 [YardPolygonsMapScreen] Initializing MQTT for ${chipIds.length} chips:`, chipIds);

            const MQTT_CONFIG = getMQTTConfig('yard-polygons-map');
            const client = mqtt.connect(MQTT_CONFIG.host, {
                username: MQTT_CONFIG.username,
                password: MQTT_CONFIG.password,
                clientId: MQTT_CONFIG.clientId,
                protocolVersion: MQTT_CONFIG.protocolVersion,
            });

            // Initialize buffer for each chip
            chipIds.forEach(chipId => {
                mqttBufferRef.current[chipId] = { lat: null, lon: null };
            });

            client.on("connect", () => {
                console.log("✅ [YardPolygonsMapScreen] Connected to MQTT");
                setMqttConnected(true);

                // Subscribe to topics for all chips
                chipIds.forEach(chipId => {
                    const latitudeTopic = `/device_sensor_data/449810146246400/${chipId}/+/vs/4198`;
                    const longitudeTopic = `/device_sensor_data/449810146246400/${chipId}/+/vs/4197`;

                    client.subscribe(latitudeTopic, (err) => {
                        if (err) {
                            console.error(`❌ [YardPolygonsMapScreen] MQTT Subscribe error (latitude) for ${chipId}:`, err);
                        } else {
                            console.log(`✅ [YardPolygonsMapScreen] Subscribed to latitude topic for chip ${chipId}`);
                        }
                    });

                    client.subscribe(longitudeTopic, (err) => {
                        if (err) {
                            console.error(`❌ [YardPolygonsMapScreen] MQTT Subscribe error (longitude) for ${chipId}:`, err);
                        } else {
                            console.log(`✅ [YardPolygonsMapScreen] Subscribed to longitude topic for chip ${chipId}`);
                        }
                    });
                });
            });

            client.on("message", async (topic, message) => {
                try {
                    const payload = JSON.parse(message.toString());

                    // Extract chip ID from topic
                    // Topic format: /device_sensor_data/449810146246400/2CF7F1C07190019F/0/vs/4197
                    const topicParts = topic.split('/');
                    const chipId = topicParts[3];

                    if (!chipId || !mqttBufferRef.current[chipId]) {
                        return; // Not a chip we're monitoring
                    }

                    // Store latitude or longitude
                    if (topic.includes("4197")) {
                        mqttBufferRef.current[chipId].lon = payload.value; // Longitude
                    } else if (topic.includes("4198")) {
                        mqttBufferRef.current[chipId].lat = payload.value; // Latitude
                    }

                    // Update location when both lat & lon are available
                    const buffer = mqttBufferRef.current[chipId];
                    if (buffer.lat !== null && buffer.lon !== null) {
                        const latitude = parseFloat(buffer.lat);
                        const longitude = parseFloat(buffer.lon);

                        if (!isNaN(latitude) && !isNaN(longitude)) {
                            console.log(`🚗 [YardPolygonsMapScreen] MQTT location update for chip ${chipId}:`, { latitude, longitude });

                            // Update state
                            setVehicleLocations(prev => ({
                                ...prev,
                                [chipId]: {
                                    ...prev[chipId],
                                    latitude,
                                    longitude,
                                    lastUpdate: new Date().toISOString(),
                                }
                            }));

                            // Update database
                            try {
                                const currentTimestamp = new Date().toISOString();
                                const { error: updateError } = await supabase
                                    .from('cars')
                                    .update({
                                        latitude: latitude,
                                        longitude: longitude,
                                        last_location_update: currentTimestamp
                                    })
                                    .eq('chip', chipId);

                                if (updateError) {
                                    console.error(`❌ [YardPolygonsMapScreen] Error updating location in database for chip ${chipId}:`, updateError);
                                } else {
                                    console.log(`✅ [YardPolygonsMapScreen] Updated location in database for chip ${chipId}`);
                                }
                            } catch (dbError) {
                                console.error(`❌ [YardPolygonsMapScreen] Database update error for chip ${chipId}:`, dbError);
                            }

                            // Reset buffer
                            buffer.lat = null;
                            buffer.lon = null;
                        }
                    }
                } catch (error) {
                    console.error('❌ [YardPolygonsMapScreen] Error parsing MQTT message:', error);
                }
            });

            client.on("error", (error) => {
                console.error("❌ [YardPolygonsMapScreen] MQTT Error:", error);
                setMqttConnected(false);
            });

            client.on("close", () => {
                console.log("🔌 [YardPolygonsMapScreen] MQTT Connection closed");
                setMqttConnected(false);
            });

            setMqttClient(client);

        } catch (error) {
            console.error("❌ [YardPolygonsMapScreen] MQTT Initialization error:", error);
            setMqttConnected(false);
        }
    };

    // Helper function to parse database timestamp to UTC milliseconds
    const parseDatabaseTimestamp = (dbTimestamp) => {
        if (!dbTimestamp) return null;
        
        try {
            // Database format: "2025-11-12T15:01:07.838" (UTC format, without Z)
            // Or: "2025-11-12 15:01:07.838" (with space)
            // Or: "2025-11-12T15:03:08.142Z" (with Z, already UTC)
            
            // If timestamp ends with Z, it's already UTC
            if (dbTimestamp.endsWith('Z')) {
                return new Date(dbTimestamp).getTime();
            }
            
            // Normalize format: replace space with T if needed
            const timestampStr = dbTimestamp.includes('T') ? dbTimestamp : dbTimestamp.replace(' ', 'T');
            
            // Add Z to make it explicit UTC
            const utcTimestamp = new Date(timestampStr + 'Z').getTime();
            
            return utcTimestamp;
        } catch (error) {
            console.error('Error parsing database timestamp:', error);
            // Fallback to simple parsing
            return new Date(dbTimestamp).getTime();
        }
    };

    // Format last update time
    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        
        try {
            // Parse timestamp to milliseconds (handles both ISO strings and milliseconds)
            let timestampMs;
            if (typeof timestamp === 'string') {
                timestampMs = parseDatabaseTimestamp(timestamp);
            } else if (typeof timestamp === 'number') {
                timestampMs = timestamp;
            } else {
                timestampMs = new Date(timestamp).getTime();
            }

            if (!timestampMs || isNaN(timestampMs)) {
                return 'Unknown';
            }

            const now = Date.now();
            const diffMs = now - timestampMs;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHour = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHour / 24);
            
            if (diffSec < 60) return `${diffSec}s ago`;
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHour < 24) return `${diffHour}h ago`;
            if (diffDay < 7) return `${diffDay}d ago`;
            
            // For older dates, show formatted date
            const updateDate = new Date(timestampMs);
            return updateDate.toLocaleDateString() + ' ' + updateDate.toLocaleTimeString();
        } catch (error) {
            console.error('Error formatting last update:', error);
            return 'Unknown';
        }
    };

    // Handle vehicle marker click
    const handleVehicleClick = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowTooltip(true);
    };

    // Close tooltip
    const closeTooltip = () => {
        setShowTooltip(false);
        setSelectedVehicle(null);
    };

    useEffect(() => {
        loadPolygons();
        loadVehicles();
    }, [yardId]);

    // Initialize MQTT when vehicles are loaded
    useEffect(() => {
        if (vehicles.length > 0) {
            initializeMqtt();
        }

        // Cleanup MQTT on unmount
        return () => {
            if (mqttClient) {
                console.log('🔌 [YardPolygonsMapScreen] Disconnecting MQTT...');
                mqttClient.end();
                setMqttClient(null);
            }
        };
    }, [vehicles.length]);

    // Reconnect MQTT when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (vehicles.length > 0 && !mqttClient) {
                console.log('🔄 [YardPolygonsMapScreen] Screen focused, reconnecting MQTT...');
                initializeMqtt();
            }

            return () => {
                // Don't disconnect on blur, keep connection alive
            };
        }, [vehicles.length])
    );

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

                    {/* Render Vehicle Markers */}
                    {vehicles.map((vehicle) => {
                        if (!vehicle.chip) return null;
                        
                        const location = vehicleLocations[vehicle.chip];
                        if (!location || !location.latitude || !location.longitude) {
                            return null; // Don't show vehicles without location
                        }

                        return (
                            <Marker
                                key={vehicle.id}
                                coordinate={{
                                    latitude: location.latitude,
                                    longitude: location.longitude,
                                }}
                                onPress={() => handleVehicleClick(vehicle)}
                            >
                                <View style={styles.vehicleMarkerContainer}>
                                    <View style={styles.carLocationMarker}>
                                        <Ionicons name="car" size={15} color="#fff" />
                                    </View>
                                </View>
                            </Marker>
                        );
                    })}
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

                {/* Vehicle Count Badge */}
                {Object.keys(vehicleLocations).length > 0 && (
                    <View style={styles.vehicleCountBadge}>
                        <Ionicons name="car" size={16} color={COLOR_PRIMARY} />
                        <Text style={styles.vehicleCountText}>
                            {Object.keys(vehicleLocations).length} vehicles
                        </Text>
                    </View>
                )}
            </View>

            {/* Vehicle Tooltip Modal */}
            <Modal
                transparent={true}
                visible={showTooltip}
                animationType="fade"
                onRequestClose={closeTooltip}
            >
                <TouchableOpacity 
                    style={styles.tooltipOverlay} 
                    activeOpacity={1} 
                    onPress={closeTooltip}
                >
                    <View style={styles.tooltipContainer}>
                        <TouchableOpacity activeOpacity={1}>
                            <View style={styles.tooltipHeader}>
                                <Text style={styles.tooltipTitle}>Vehicle Details</Text>
                                <TouchableOpacity onPress={closeTooltip}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                            
                            {selectedVehicle && (
                                <View style={styles.tooltipContent}>
                                    <View style={styles.tooltipRow}>
                                        <Ionicons name="car" size={20} color="#007AFF" />
                                        <Text style={styles.tooltipLabel}>VIN:</Text>
                                        <Text style={styles.tooltipValue}>{selectedVehicle.vin || 'N/A'}</Text>
                                    </View>
                                    
                                    <View style={styles.tooltipRow}>
                                        <Ionicons name="hardware-chip" size={20} color="#34C759" />
                                        <Text style={styles.tooltipLabel}>Chip ID:</Text>
                                        <Text style={styles.tooltipValue}>{selectedVehicle.chip || 'N/A'}</Text>
                                    </View>
                                    
                                    <View style={styles.tooltipRow}>
                                        <Ionicons name="time" size={20} color="#FF3B30" />
                                        <Text style={styles.tooltipLabel}>Last Update:</Text>
                                        <Text style={styles.tooltipValue}>
                                            {formatLastUpdate(
                                                vehicleLocations[selectedVehicle.chip]?.lastUpdate || 
                                                selectedVehicle.last_location_update ||
                                                null
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
    vehicleMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    carLocationMarker: {
        backgroundColor: '#FF6B6B',
        width: 25,
        height: 25,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    vehicleCountBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
    },
    vehicleCountText: {
        marginLeft: 6,
        fontSize: style.fontSizeSmall1x.fontSize,
        fontWeight: style.fontWeightBold.fontWeight,
        color: '#333',
    },
    tooltipOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        margin: spacings.large,
        minWidth: width * 0.8,
        maxWidth: width * 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    tooltipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacings.large,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    tooltipTitle: {
        fontSize: style.fontSizeMedium1x.fontSize,
        fontWeight: style.fontWeightBold.fontWeight,
        color: '#000',
    },
    tooltipContent: {
        padding: spacings.large,
    },
    tooltipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tooltipLabel: {
        fontSize: style.fontSizeSmall1x.fontSize,
        fontWeight: style.fontWeightMedium.fontWeight,
        color: '#666',
        marginLeft: 8,
        marginRight: 8,
        minWidth: 80,
    },
    tooltipValue: {
        fontSize: 14,
        color: '#000',
        flex: 1,
        fontWeight: '500',
    },
});

export default YardPolygonsMapScreen;

