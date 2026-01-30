// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, ActivityIndicator, Linking, Animated, Dimensions } from 'react-native';
// import { useIsFocused } from '@react-navigation/native';
// import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
// import Geolocation from '@react-native-community/geolocation';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import MapView, { Polyline, Marker } from 'react-native-maps';
// import { ScrollView } from 'react-native';
// import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

// // Simple bearing/distance helpers
// function toRadians(deg) {
//   return (deg * Math.PI) / 180;
// }
// function toDegrees(rad) {
//   return (rad * 180) / Math.PI;
// }
// function computeBearing(lat1, lon1, lat2, lon2) {
//   const φ1 = toRadians(lat1);
//   const φ2 = toRadians(lat2);
//   const Δλ = toRadians(lon2 - lon1);
//   const y = Math.sin(Δλ) * Math.cos(φ2);
//   const x = Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ) - Math.sin(φ1) * Math.sin(φ2);
//   const θ = Math.atan2(y, x);
//   return (toDegrees(θ) + 360) % 360;
// }
// function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
//   const R = 6371000;
//   const dLat = toRadians(lat2 - lat1);
//   const dLon = toRadians(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }
// function normalizeAngle(angle) {
//   let a = angle % 360;
//   if (a > 180) a -= 360;
//   if (a < -180) a += 360;
//   return a;
// }

// export default function ARNavigationScreen({ navigation, route }) {
//   const isFocused = useIsFocused();
//   const devices = useCameraDevices();
//   const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();

//   const [cameraDevice, setCameraDevice] = useState(null);
//   const [loadingDevice, setLoadingDevice] = useState(false);

//   const target = route?.params?.target;
//   const staticStart = route?.params?.start || null; // allow manual start when GPS off
//   const [hasLocationPermission, setHasLocationPermission] = useState(false);
//   const [position, setPosition] = useState(null);
//   const lastPositionRef = useRef(null);
//   const arrowRotation = useRef(new Animated.Value(0)).current;
//   const [smoothBearing, setSmoothBearing] = useState(0);
//   const [routeData, setRouteData] = useState(null);
//   const [currentStep, setCurrentStep] = useState(null);
//   const [currentStepIndex, setCurrentStepIndex] = useState(null);
//   const [totalSteps, setTotalSteps] = useState(0);
//   const [distanceToNextTurn, setDistanceToNextTurn] = useState(null);
//   const [arrowIcon, setArrowIcon] = useState('navigate');
//   const [routeCoordinates, setRouteCoordinates] = useState([]);
//   const [showMap, setShowMap] = useState(true);
//   const [deviceHeading, setDeviceHeading] = useState(0);
//   const [userOrientation, setUserOrientation] = useState('North');
//   const [arrowColor, setArrowColor] = useState('#5F93FB');
//   const [guidanceMessage, setGuidanceMessage] = useState('');
//   const compassRotation = useRef(new Animated.Value(0)).current;

//   // Basic magnetometer heading derived from x/y (no tilt compensation)
//   function calculateHeadingFromMagnetometer(x, y) {
//     if (x == null || y == null) return null;
//     let heading = Math.atan2(y, x) * (180 / Math.PI);
//     if (heading < 0) heading += 360;
//     return heading;
//   }

//   async function requestLocationPermission() {
//     try {
//       if (Platform.OS === 'android') {
//         const res = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         );
//         setHasLocationPermission(res === PermissionsAndroid.RESULTS.GRANTED);
//       } else {
//         const status = await Geolocation.requestAuthorization('whenInUse');
//         setHasLocationPermission(status === 'granted');
//       }
//     } catch (e) {
//       setHasLocationPermission(false);
//     }
//   }

//   // Google Directions API call for road-based navigation
//   async function fetchRouteDirections(origin, destination) {
//     try {
//       const API_KEY = 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE';
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${API_KEY}`;

//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.status === 'OK' && data.routes.length > 0) {
//         const route = data.routes[0];
//         const steps = route.legs[0].steps;
//         setRouteData({ route, steps });
//         setTotalSteps(steps.length || 0);

//         // Extract route coordinates for map polyline
//         const coordinates = route.overview_polyline.points;
//         const decodedCoordinates = decodePolyline(coordinates);
//         setRouteCoordinates(decodedCoordinates);

//         console.log('🗺️ Route fetched successfully!');
//         console.log('📊 Route Summary:', {
//           totalSteps: steps.length,
//           totalDistance: route.legs[0].distance.text,
//           totalDuration: route.legs[0].duration.text,
//           routeCoordinates: decodedCoordinates.length
//         });

//         // Log each step with complete details
//         console.log('📋 All Route Steps:');
//         steps.forEach((step, index) => {
//           const instruction = step.html_instructions
//             .replace(/<[^>]*>/g, '') // Remove HTML tags
//             .replace(/&nbsp;/g, ' ') // Replace HTML entities
//             .trim();

//           console.log(`Step ${index + 1}:`, {
//             instruction: instruction,
//             distance: step.distance?.text || '0 m',
//             duration: step.duration?.text || '0 min',
//             startLocation: {
//               lat: step.start_location.lat,
//               lng: step.start_location.lng
//             },
//             endLocation: {
//               lat: step.end_location.lat,
//               lng: step.end_location.lng
//             },
//             maneuver: step.maneuver || 'none',
//             travelMode: step.travel_mode || 'driving',
//             isFirstStep: index === 0,
//             isLastStep: index === steps.length - 1
//           });
//         });

//         console.log('🎯 Navigation will start from Step 1 (first step)');

//         return { route, steps };
//       } else {
//         console.log('❌ Route fetch failed:', data.status);
//         return null;
//       }
//     } catch (error) {
//       console.log('❌ Route API Error:', error);
//       return null;
//     }
//   }

//   // Calculate which step we're currently on based on position
//   function getCurrentNavigationStep(currentPos, steps) {
//     if (!steps || !currentPos) return null;

//     let closestStep = null;
//     let minDistance = Infinity;
//     let currentStepIndex = 0;

//     // Find the closest step to current position
//     steps.forEach((step, index) => {
//       const stepStart = step.start_location;
//       const stepEnd = step.end_location;

//       // Calculate distance to step start and end
//       const distanceToStart = haversineDistanceMeters(
//         currentPos.latitude, currentPos.longitude,
//         stepStart.lat, stepStart.lng
//       );

//       const distanceToEnd = haversineDistanceMeters(
//         currentPos.latitude, currentPos.longitude,
//         stepEnd.lat, stepEnd.lng
//       );

//       // Use the minimum distance to either start or end of step
//       const minStepDistance = Math.min(distanceToStart, distanceToEnd);

//       if (minStepDistance < minDistance) {
//         minDistance = minStepDistance;
//         closestStep = { ...step, index, distance: minStepDistance };
//         currentStepIndex = index;
//       }
//     });

//     // Only move to next step if we're very close to current step (within 20m)
//     if (closestStep && minDistance < 20) { // Reduced threshold to 20m
//       const nextStepIndex = currentStepIndex + 1;
//       if (nextStepIndex < steps.length) {
//         const nextStep = steps[nextStepIndex];
//         const nextInstruction = nextStep.html_instructions
//           .replace(/<[^>]*>/g, '')
//           .replace(/&nbsp;/g, ' ')
//           .trim();

//         console.log('🔄 Moving to next step (very close to current):', {
//           currentStepIndex: currentStepIndex,
//           nextStepIndex: nextStepIndex,
//           currentInstruction: closestStep.html_instructions
//             .replace(/<[^>]*>/g, '')
//             .replace(/&nbsp;/g, ' ')
//             .trim(),
//           nextInstruction: nextInstruction,
//           distanceToCurrent: minDistance.toFixed(1) + 'm',
//           reason: 'Very close to current step (within 20m)'
//         });
//         return { ...nextStep, index: nextStepIndex, distance: minDistance };
//       }
//     }

//     const currentInstruction = closestStep?.html_instructions
//       ?.replace(/<[^>]*>/g, '')
//       ?.replace(/&nbsp;/g, ' ')
//       ?.trim() || 'No instruction';

//     console.log('📍 Current step analysis:', {
//       stepIndex: currentStepIndex,
//       instruction: currentInstruction,
//       distanceToStep: minDistance.toFixed(1) + 'm',
//       stepStart: closestStep?.start_location ? {
//         lat: closestStep.start_location.lat,
//         lng: closestStep.start_location.lng
//       } : 'Unknown',
//       stepEnd: closestStep?.end_location ? {
//         lat: closestStep.end_location.lat,
//         lng: closestStep.end_location.lng
//       } : 'Unknown',
//       reason: minDistance < 20 ? 'Very close - will move to next step' : 'Following current step',
//       threshold: '20m (reduced from 50m)'
//     });
//     return closestStep;
//   }

//   // Decode Google polyline to coordinates
//   function decodePolyline(encoded) {
//     const poly = [];
//     let index = 0;
//     const len = encoded.length;
//     let lat = 0;
//     let lng = 0;

//     while (index < len) {
//       let b, shift = 0, result = 0;
//       do {
//         b = encoded.charAt(index++).charCodeAt(0) - 63;
//         result |= (b & 0x1f) << shift;
//         shift += 5;
//       } while (b >= 0x20);
//       const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
//       lat += dlat;

//       shift = 0;
//       result = 0;
//       do {
//         b = encoded.charAt(index++).charCodeAt(0) - 63;
//         result |= (b & 0x1f) << shift;
//         shift += 5;
//       } while (b >= 0x20);
//       const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
//       lng += dlng;

//       poly.push({
//         latitude: lat / 1e5,
//         longitude: lng / 1e5,
//       });
//     }
//     return poly;
//   }

//   // Get device orientation (North, South, East, West) from GPS heading
//   function getDeviceOrientation(heading) {
//     if (heading === null || heading === undefined) return 'North';

//     // Normalize heading to 0-360 range
//     let normalizedHeading = heading;
//     while (normalizedHeading < 0) normalizedHeading += 360;
//     while (normalizedHeading >= 360) normalizedHeading -= 360;

//     if (normalizedHeading >= 337.5 || normalizedHeading < 22.5) return 'North';
//     if (normalizedHeading >= 22.5 && normalizedHeading < 67.5) return 'Northeast';
//     if (normalizedHeading >= 67.5 && normalizedHeading < 112.5) return 'East';
//     if (normalizedHeading >= 112.5 && normalizedHeading < 157.5) return 'Southeast';
//     if (normalizedHeading >= 157.5 && normalizedHeading < 202.5) return 'South';
//     if (normalizedHeading >= 202.5 && normalizedHeading < 247.5) return 'Southwest';
//     if (normalizedHeading >= 247.5 && normalizedHeading < 292.5) return 'West';
//     if (normalizedHeading >= 292.5 && normalizedHeading < 337.5) return 'Northwest';
//     return 'North';
//   }

//   // Calculate relative direction based on device orientation
//   function calculateRelativeDirection(targetBearing, deviceHeading) {
//     if (targetBearing === null || deviceHeading === null) return 0;

//     // Calculate relative bearing (target bearing - device heading)
//     let relativeBearing = targetBearing - deviceHeading;

//     // Normalize to 0-360 range
//     while (relativeBearing < 0) relativeBearing += 360;
//     while (relativeBearing >= 360) relativeBearing -= 360;

//     return relativeBearing;
//   }

//   // Get appropriate arrow icon based on instruction and device orientation
//   function getArrowIcon(instruction, targetBearing, deviceHeading) {
//     const lowerInstruction = instruction.toLowerCase();
//     console.log('🔍 Checking instruction for arrow:', lowerInstruction);

//     // Calculate relative direction
//     const relativeBearing = calculateRelativeDirection(targetBearing, deviceHeading);
//     const orientation = getDeviceOrientation(deviceHeading);

//     console.log('🧭 Device Orientation:', {
//       deviceHeading: deviceHeading.toFixed(1),
//       orientation: orientation,
//       targetBearing: targetBearing?.toFixed(1),
//       relativeBearing: relativeBearing.toFixed(1)
//     });

//     // Use instruction-based arrows for turn directions
//     if (lowerInstruction.includes('left') || lowerInstruction.includes('turn left')) {
//       console.log('⬅️ Setting LEFT arrow');
//       return 'arrow-back';
//     } else if (lowerInstruction.includes('right') || lowerInstruction.includes('turn right')) {
//       console.log('➡️ Setting RIGHT arrow');
//       return 'arrow-forward';
//     } else if (lowerInstruction.includes('u-turn') || lowerInstruction.includes('uturn')) {
//       console.log('⬇️ Setting U-TURN arrow');
//       return 'arrow-down';
//     } else if (lowerInstruction.includes('straight') || lowerInstruction.includes('continue') || lowerInstruction.includes('go straight')) {
//       console.log('⬆️ Setting STRAIGHT arrow');
//       return 'arrow-up';
//     } else {
//       // For general navigation, use relative bearing
//       if (relativeBearing >= 315 || relativeBearing < 45) {
//         console.log('⬆️ Setting FORWARD arrow (North)');
//         return 'arrow-up';
//       } else if (relativeBearing >= 45 && relativeBearing < 135) {
//         console.log('➡️ Setting RIGHT arrow (East)');
//         return 'arrow-forward';
//       } else if (relativeBearing >= 135 && relativeBearing < 225) {
//         console.log('⬇️ Setting BACK arrow (South)');
//         return 'arrow-down';
//       } else if (relativeBearing >= 225 && relativeBearing < 315) {
//         console.log('⬅️ Setting LEFT arrow (West)');
//         return 'arrow-back';
//       } else {
//         console.log('🧭 Setting DEFAULT navigate arrow');
//         return 'navigate';
//       }
//     }
//   }

//   // Convert Google html instruction to plain text
//   function normalizeInstruction(html) {
//     if (!html) return '';
//     try {
//       return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
//     } catch (e) {
//       return String(html);
//     }
//   }

//   // Choose an icon for a navigation step
//   function iconForStep(step) {
//     const m = (step?.maneuver || '').toLowerCase();
//     const txt = normalizeInstruction(step?.html_instructions || '');
//     if (m.includes('left') || txt.includes('left')) return 'arrow-back';
//     if (m.includes('right') || txt.includes('right')) return 'arrow-forward';
//     if (m.includes('uturn') || m.includes('u-turn')) return 'arrow-down';
//     if (m.includes('straight') || txt.includes('continue') || txt.includes('straight')) return 'arrow-up';
//     return 'navigate';
//   }

//   // Initial location fetch (one-shot) to seed distance quickly
//   useEffect(() => {
//     console.log('🎯 Fetching initial location...');
//     Geolocation.getCurrentPosition(
//       pos => {
//         console.log('🎯 Initial Location Received:', {
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//           accuracy: pos.coords.accuracy,
//           heading: pos.coords.heading
//         });
//         setPosition(pos.coords);
//         lastPositionRef.current = pos.coords;

//         // Set initial device heading
//         if (pos.coords.heading !== undefined && pos.coords.heading !== null) {
//           setDeviceHeading(pos.coords.heading);
//           const orientation = getDeviceOrientation(pos.coords.heading);
//           setUserOrientation(orientation);
//         }
//       },
//       err => {
//         console.log('❌ Initial GPS Error:', err);
//         // Retry initial location fetch
//         setTimeout(() => {
//           console.log('🔄 Retrying initial location fetch...');
//           Geolocation.getCurrentPosition(
//             pos => setPosition(pos.coords),
//             err => console.log('❌ Retry GPS Error:', err),
//             { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
//           );
//         }, 3000);
//       },
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
//     );
//   }, []);

//   useEffect(() => {
//     requestLocationPermission();
//   }, []);

//   // Device orientation tracking using magnetometer (fallback to GPS heading)
//   useEffect(() => {
//     console.log('📱 Using magnetometer for device orientation (fallback to GPS)');
//     try {
//       setUpdateIntervalForType(SensorTypes.magnetometer, 100);
//     } catch (e) { }

//     let subscription = magnetometer.subscribe(({ x, y, z }) => {
//       const heading = calculateHeadingFromMagnetometer(x, y);
//       if (heading != null) {
//         setDeviceHeading(heading);
//         const orientation = getDeviceOrientation(heading);
//         setUserOrientation(orientation);
//       }
//     });

//     return () => {
//       try { subscription && subscription.unsubscribe && subscription.unsubscribe(); } catch (e) { }
//     };
//   }, []);

//   // Remove duplicate GPS tracking - now handled in main GPS effect

//   // Fetch route when position is available
//   useEffect(() => {
//     if (position && target) {
//       console.log('🗺️ Fetching route for position:', position.latitude, position.longitude);
//       fetchRouteDirections(position, target);
//     }
//   }, [position, target]);

//   // Auto-request camera when screen focused and not granted yet
//   useEffect(() => {
//     if (isFocused && !hasCameraPermission) {
//       requestCameraPermission();
//     }
//   }, [isFocused, hasCameraPermission, requestCameraPermission]);

//   // Acquire a usable back camera once permission is granted
//   useEffect(() => {
//     async function loadDevice() {
//       if (!hasCameraPermission || !isFocused) return;
//       try {
//         setLoadingDevice(true);
//         let device = devices?.back ?? null;
//         if (!device) {
//           const available = await Camera.getAvailableCameraDevices();
//           device = available.find(d => d.position === 'back') || available[0] || null;
//         }
//         setCameraDevice(device || null);
//       } catch (e) {
//         setCameraDevice(null);
//       } finally {
//         setLoadingDevice(false);
//       }
//     }
//     loadDevice();
//   }, [hasCameraPermission, isFocused, devices]);

//   useEffect(() => {
//     if (!hasLocationPermission) return;

//     console.log('🔄 Starting GPS tracking...');

//     const watchId = Geolocation.watchPosition(
//       pos => {
//         console.log('📍 GPS Update Received:', {
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//           accuracy: pos.coords.accuracy,
//           heading: pos.coords.heading,
//           speed: pos.coords.speed,
//           timestamp: new Date(pos.timestamp).toLocaleTimeString()
//         });

//         // Update position immediately
//         setPosition(pos.coords);
//         lastPositionRef.current = pos.coords;

//         // Update device heading if available
//         if (pos.coords.heading !== undefined && pos.coords.heading !== null) {
//           setDeviceHeading(pos.coords.heading);
//           const orientation = getDeviceOrientation(pos.coords.heading);
//           setUserOrientation(orientation);
//           console.log('🧭 Device Heading Updated:', pos.coords.heading.toFixed(1), 'Orientation:', orientation);
//         }
//       },
//       err => {
//         console.log('❌ GPS Error:', err);
//         // Retry GPS tracking on error
//         setTimeout(() => {
//           console.log('🔄 Retrying GPS tracking...');
//         }, 2000);
//       },
//       {
//         enableHighAccuracy: true,
//         distanceFilter: 0.1, // More sensitive - update every 0.1m
//         interval: 100, // Faster updates - every 100ms
//         fastestInterval: 50, // Fastest possible updates
//         timeout: 10000,
//         maximumAge: 1000
//       },
//     );

//     console.log('✅ GPS tracking started with watchId:', watchId);

//     return () => {
//       console.log('🛑 Stopping GPS tracking...');
//       Geolocation.clearWatch(watchId);
//     };
//   }, [hasLocationPermission]); // Remove position dependency to avoid re-creation

//   const { bearingToTarget, distance, movementBearing, turnInstruction } = useMemo(() => {
//     const current = position || staticStart;
//     if (!current) {
//       return { bearingToTarget: null, distance: null, movementBearing: null, turnInstruction: 'Location needed' };
//     }

//     // Use road-based navigation if route data is available
//     if (routeData && routeData.steps) {
//       const currentStep = getCurrentNavigationStep(current, routeData.steps);
//       if (currentStep) {
//         setCurrentStep(currentStep);
//         setCurrentStepIndex(currentStep.index);

//         // Calculate bearing to next step (use step end location for direction)
//         const nextStepBearing = computeBearing(
//           current.latitude, current.longitude,
//           currentStep.end_location.lat, currentStep.end_location.lng
//         );

//         // Get instruction from Google Directions
//         const instruction = currentStep.html_instructions
//           .replace(/<[^>]*>/g, '') // Remove HTML tags
//           .replace(/&nbsp;/g, ' ') // Replace HTML entities
//           .trim();

//         const stepDistance = currentStep.distance?.text || '0 m';
//         setDistanceToNextTurn(stepDistance);

//         // Set appropriate arrow icon based on instruction and device orientation
//         const icon = getArrowIcon(instruction, nextStepBearing, deviceHeading);
//         setArrowIcon(icon);

//         console.log('🛣️ Road Navigation (Route-based):', {
//           stepIndex: currentStep.index,
//           instruction: instruction,
//           distance: stepDistance,
//           street: currentStep.html_instructions,
//           arrowIcon: icon,
//           bearing: nextStepBearing?.toFixed(1),
//           stepStart: { lat: currentStep.start_location.lat, lng: currentStep.start_location.lng },
//           stepEnd: { lat: currentStep.end_location.lat, lng: currentStep.end_location.lng },
//           maneuver: currentStep.maneuver || 'none',
//           travelMode: currentStep.travel_mode || 'driving',
//           duration: currentStep.duration?.text || '0 min'
//         });

//         // Use Google route distance instead of direct distance
//         const routeDistance = routeData.route.legs[0].distance.value; // Distance in meters
//         const routeDistanceText = routeData.route.legs[0].distance.text; // Distance with unit

//         console.log('📏 Distance Comparison:', {
//           directDistance: haversineDistanceMeters(current.latitude, current.longitude, target.latitude, target.longitude).toFixed(0) + 'm',
//           routeDistance: routeDistanceText,
//           routeDistanceMeters: routeDistance + 'm',
//           currentLocation: { lat: current.latitude, lng: current.longitude },
//           targetLocation: { lat: target.latitude, lng: target.longitude }
//         });

//         return {
//           bearingToTarget: nextStepBearing,
//           distance: routeDistance, // Use Google route distance
//           movementBearing: null,
//           turnInstruction: `${instruction} in ${stepDistance}`
//         };
//       }
//     }

//     // Fallback to direct bearing if no route data
//     const bTarget = computeBearing(current.latitude, current.longitude, target.latitude, target.longitude);
//     const d = haversineDistanceMeters(current.latitude, current.longitude, target.latitude, target.longitude);

//     let moveBearing = null;
//     let instruction = 'Head towards the arrow';
//     const last = lastPositionRef.current;
//     if (last && position) {
//       const moved = haversineDistanceMeters(last.latitude, last.longitude, position.latitude, position.longitude);
//       if (moved > 0.2) {
//         moveBearing = computeBearing(last.latitude, last.longitude, position.latitude, position.longitude);
//         const delta = normalizeAngle(bTarget - moveBearing);
//         const absDelta = Math.abs(delta);
//         if (absDelta <= 15) instruction = 'Go straight';
//         else if (delta > 0) instruction = `Turn right ${absDelta.toFixed(0)}°`;
//         else instruction = `Turn left ${absDelta.toFixed(0)}°`;
//       }
//     }

//     // Set arrow icon for direct navigation with device orientation
//     const icon = getArrowIcon(instruction, bTarget, deviceHeading);
//     setArrowIcon(icon);

//     console.log('🧭 Direct Navigation (Fallback):', {
//       currentLocation: { lat: current.latitude, lng: current.longitude },
//       targetLocation: { lat: target.latitude, lng: target.longitude },
//       bearingToTarget: bTarget?.toFixed(1),
//       directDistance: d?.toFixed(1) + 'm',
//       instruction: instruction,
//       arrowIcon: icon,
//       note: 'Using direct distance (straight line) - route data not available'
//     });

//     return { bearingToTarget: bTarget, distance: d, movementBearing: moveBearing, turnInstruction: instruction };
//   }, [position, staticStart, target, routeData]);

//   // Periodic consolidated console status (updates even if some UI parts are hidden)
//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       const relativeBearing = (bearingToTarget != null && deviceHeading != null)
//         ? calculateRelativeDirection(bearingToTarget, deviceHeading)
//         : null;
//       const stepInfo = currentStepIndex != null && totalSteps
//         ? `${currentStepIndex + 1}/${totalSteps}`
//         : '--';
//       console.log('🧭 AR Nav Status:', {
//         step: stepInfo,
//         instruction: turnInstruction || 'Waiting for route...',
//         distance: distanceLabel,
//         deviceHeading: deviceHeading != null ? `${deviceHeading.toFixed(1)}°` : '--',
//         orientation: userOrientation,
//         targetBearing: bearingToTarget != null ? `${bearingToTarget.toFixed(1)}°` : '--',
//         relativeBearing: relativeBearing != null ? `${relativeBearing.toFixed(1)}°` : '--',
//         arrowIcon: arrowIcon,
//       });
//     }, 1000);
//     return () => clearInterval(intervalId);
//   }, [currentStepIndex, totalSteps, turnInstruction, distanceLabel, deviceHeading, userOrientation, bearingToTarget, arrowIcon]);

//   // Smooth arrow rotation animation with device orientation compensation
//   useEffect(() => {
//     if (bearingToTarget !== null && deviceHeading !== null) {
//       // Calculate relative bearing (compensate for device orientation)
//       const relativeBearing = calculateRelativeDirection(bearingToTarget, deviceHeading);
//       const targetRotation = relativeBearing;
//       const currentRotation = smoothBearing;

//       // Calculate shortest rotation path
//       let rotationDiff = targetRotation - currentRotation;
//       if (rotationDiff > 180) rotationDiff -= 360;
//       if (rotationDiff < -180) rotationDiff += 360;

//       const newRotation = currentRotation + rotationDiff;
//       setSmoothBearing(newRotation);
//       // Update guidance message based on relative bearing
//       let guidance = 'Align with target';
//       const normalized = ((relativeBearing % 360) + 360) % 360; // 0..359
//       const absRel = Math.abs(((normalized + 540) % 360) - 180); // 0..180
//       if (absRel <= 15) guidance = 'Move forward';
//       else if (absRel >= 165) guidance = 'Move backward';
//       else if (normalized > 0 && normalized < 180) guidance = 'Turn right';
//       else guidance = 'Turn left';
//       setGuidanceMessage(guidance);

//       // console.log('🔄 Arrow Rotation:', {
//       //   targetBearing: bearingToTarget.toFixed(1),
//       //   deviceHeading: deviceHeading.toFixed(1),
//       //   relativeBearing: relativeBearing.toFixed(1),
//       //   rotationDiff: rotationDiff.toFixed(1)
//       // });

//       Animated.timing(arrowRotation, {
//         toValue: newRotation,
//         duration: 300, // Smooth 300ms animation
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [bearingToTarget, deviceHeading]);

//   // Animate compass (north-up dial rotates opposite to device heading)
//   useEffect(() => {
//     if (deviceHeading !== null && deviceHeading !== undefined) {
//       Animated.timing(compassRotation, {
//         toValue: -deviceHeading,
//         duration: 150,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [deviceHeading]);

//   const distanceLabel = distance != null ? `${distance < 1000 ? distance.toFixed(0) + ' m' : (distance / 1000).toFixed(2) + ' km'}` : '--';
//   const showCamera = cameraDevice && hasCameraPermission && isFocused;
//   const screenHeight = Dimensions.get('window').height;
//   const cameraHeight = showMap ? screenHeight * 0.55 : screenHeight;
//   const mapHeight = screenHeight * 0.45;

//   return (
//     <View style={styles.container}>
//       {/* Map View - 30% of screen */}

//       {/* Camera View - 70% of screen */}
//       <View style={[styles.cameraContainer, { height: cameraHeight }]}>
//         {showCamera ? (
//           <Camera style={StyleSheet.absoluteFill} device={cameraDevice} isActive={true} />
//         ) : (
//           <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
//             {loadingDevice ? (
//               <ActivityIndicator color="#fff" />
//             ) : (
//               <Text style={{ color: '#fff' }}>AR mode</Text>
//             )}
//           </View>
//         )}

//         <View style={styles.overlay} pointerEvents="box-none">
//           <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
//             <Ionicons name="chevron-back" size={26} color="#fff" />
//           </TouchableOpacity>

//           {/* Compass */}
//           <View style={[styles.compassBox, { bottom: showMap ? 20 : 120, }]}>
//             <View style={styles.compassDialContainer}>
//               <View style={styles.compassOuterRing} />
//               <Animated.View style={[styles.compassDial, { transform: [{ rotate: compassRotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }] }]}>
//                 <View style={styles.compassNeedleBack} />
//                 <View style={styles.compassNeedle} />
//                 {/* Cardinal labels */}
//                 <Text style={styles.compassN}>N</Text>
//                 <Text style={styles.compassE}>E</Text>
//                 <Text style={styles.compassS}>S</Text>
//                 <Text style={styles.compassW}>W</Text>
//                 {/* Cardinal ticks */}
//                 <View style={[styles.tick, styles.tickTop]} />
//                 <View style={[styles.tick, styles.tickRight]} />
//                 <View style={[styles.tick, styles.tickBottom]} />
//                 <View style={[styles.tick, styles.tickLeft]} />
//                 {/* Center hub and glass highlight */}
//                 <View style={styles.compassHub} />
//                 <View style={styles.compassGlass} />
//               </Animated.View>
//             </View>
//             <Text style={styles.compassDeg}>{deviceHeading != null ? `${deviceHeading.toFixed(0)}°` : '--'}</Text>
//           </View>

//           <View style={styles.infoBox}>
//             <Text style={styles.title}>AR Direction</Text>
//             <Text style={styles.subtitle}>Target: {target.latitude.toFixed(5)}, {target.longitude.toFixed(5)}</Text>
//             <Text style={styles.subtitle}>Heading: {deviceHeading != null ? `${deviceHeading.toFixed(1)}°` : '--'} ({userOrientation})</Text>
//             <Text style={styles.subtitle}>Step: {currentStepIndex != null && totalSteps ? `${currentStepIndex + 1}/${totalSteps}` : '--'}</Text>
//             <Text style={styles.distance}>{distanceLabel}</Text>
//             <Text style={[styles.turnText]}>{guidanceMessage}</Text>

//           </View>

//           {/* Steps Toggle Button */}
//           <TouchableOpacity
//             style={[styles.mapToggleBtn,{ bottom: showMap ? 45 : 140, }]}
//             onPress={() => setShowMap(!showMap)}
//           >
//             <Ionicons name={showMap ? "list" : "list-outline"} size={20} color="#fff" />
//           </TouchableOpacity>

//           <View style={[styles.arrowContainer, { bottom: showMap ? 120 : 350, }]}>
//             <Animated.View style={[styles.arrowContainer, { bottom: showMap ? 120 : 150, }, {
//               transform: [{
//                 rotate: arrowRotation.interpolate({
//                   inputRange: [-180, 180],
//                   outputRange: ['-180deg', '180deg']
//                 })
//               }]
//             }]}>
//               <Ionicons name={arrowIcon} size={60} color={arrowColor} />
//             </Animated.View>
//             <Animated.View style={{ marginTop: 8, transform: [{ rotate: arrowRotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}>
//               <Ionicons name="cube-outline" size={28} color="#9ad" />
//             </Animated.View>
//             <Text style={styles.arrowLabel}>{bearingToTarget != null ? `${bearingToTarget.toFixed(0)}°` : '--'}</Text>
//             <Text style={[styles.turnText, { textAlign: "center" }]}>{turnInstruction}</Text>
//           </View>
//         </View>
//       </View>
//       {showMap && (
//         <View style={[styles.mapContainer, { height: mapHeight }]}>
//           {/* Map on top */}
//           <View style={{ height: mapHeight * 0.45 }}>
//             <MapView
//               style={StyleSheet.absoluteFill}
//               initialRegion={{
//                 latitude: position?.latitude || target?.latitude || 0,
//                 longitude: position?.longitude || target?.longitude || 0,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//               }}
//               showsUserLocation={true}
//               showsMyLocationButton={false}
//               showsCompass={false}
//               showsScale={false}
//               showsBuildings={true}
//               showsTraffic={false}
//             >
//               {/* Route Polyline */}
//               {routeCoordinates.length > 0 && (
//                 <Polyline
//                   coordinates={routeCoordinates}
//                   strokeColor="#5F93FB"
//                   strokeWidth={4}
//                   lineDashPattern={[1]}
//                 />
//               )}
//               {/* Destination Marker */}
//               {target && (
//                 <Marker
//                   coordinate={{
//                     latitude: target.latitude,
//                     longitude: target.longitude,
//                   }}
//                   title="Destination"
//                   pinColor="red"
//                 />
//               )}
//             </MapView>
//           </View>

//           {/* Steps list below map */}
//           <View style={{ padding: 10 }}>
//             <Text style={styles.mapInfoText}>Total Steps :- {totalSteps ? `${totalSteps} steps` : 'Loading steps...'}</Text>
//           </View>
//           <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 12 }}>
//             {(routeData?.steps || []).map((s, idx) => {
//               const isActive = idx === currentStepIndex;
//               const instr = normalizeInstruction(s.html_instructions);
//               const ico = iconForStep(s);
//               return (
//                 <View key={`step-${idx}`} style={[styles.stepItem, isActive ? styles.stepActive : null]}>
//                   <Ionicons name={ico} size={20} color={isActive ? '#0af' : '#9ad'} />
//                   <View style={{ marginLeft: 10, flex: 1 }}>
//                     <Text style={[styles.stepTitle]} numberOfLines={2}>
//                       {instr || 'Proceed'}
//                     </Text>
//                     <Text style={styles.stepMeta}>
//                       {s.distance?.text || '--'}{s.duration?.text ? ` • ${s.duration.text}` : ''}
//                     </Text>
//                   </View>
//                   <Text style={[styles.stepIndex, isActive ? { color: '#0af' } : null]}>{idx + 1}</Text>
//                 </View>
//               );
//             })}
//           </ScrollView>
//         </View>
//       )}

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: 'black' },
//   cameraContainer: { flex: 1 },
//   cameraPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
//   overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
//   backBtn: { position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
//   infoBox: { position: 'absolute', top: 50, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
//   mapToggleBtn: { position: 'absolute', right: 16, backgroundColor: 'rgba(211, 195, 195, 0.4)', padding: 8, borderRadius: 20 },
//   title: { color: '#fff', fontSize: 14, fontWeight: '700' },
//   subtitle: { color: '#fff', fontSize: 12, marginTop: 2 },
//   distance: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
//   arrowContainer: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
//   arrow: { alignItems: 'center', justifyContent: 'center' },
//   arrowLabel: { color: '#fff', fontSize: 16, marginTop: 10, },
//   turnText: { color: '#fff', fontSize: 16, marginTop: 6 },
//   streetBtn: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
//   locBtn: { backgroundColor: '#5F93FB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
//   mapContainer: { backgroundColor: '#fff' },
//   mapInfoOverlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8 },
//   mapInfoText: { color: '#000', fontSize: 12, fontWeight: '600' },
//   mapInfoSubtext: { color: '#333', fontSize: 10, marginTop: 2 },
//   orientation: { color: '#fff', fontSize: 12, marginTop: 4 },
//   turnHint: { color: '#fff', fontSize: 12, marginTop: 4 },
//   compassBox: { position: 'absolute', alignItems: 'center', zIndex: 10 },
//   compassDialContainer: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
//   compassOuterRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.4)', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
//   compassDial: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(8, 7, 7, 0.92)', borderWidth: 1, borderColor: '#cfd8dc', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
//   compassNeedleBack: { position: 'absolute', top: 6, width: 2, height: 24, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
//   compassNeedle: { position: 'absolute', top: 6, width: 2, height: 24, backgroundColor: '#ff5252', borderRadius: 1 },
//   compassN: { position: 'absolute', top: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
//   compassE: { position: 'absolute', right: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
//   compassS: { position: 'absolute', bottom: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
//   compassW: { position: 'absolute', left: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
//   compassHub: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#eceff1', borderWidth: 1, borderColor: '#90a4ae' },
//   compassGlass: { position: 'absolute', width: 64, height: 32, top: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
//   compassDeg: { marginTop: 6, color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
//   tick: { position: 'absolute', backgroundColor: '#fff', opacity: 0.9 },
//   tickTop: { top: 2, width: 10, height: 2, borderRadius: 1 },
//   tickRight: { right: 2, width: 2, height: 10, borderRadius: 1 },
//   tickBottom: { bottom: 2, width: 10, height: 2, borderRadius: 1 },
//   tickLeft: { left: 2, width: 2, height: 10, borderRadius: 1 },
//   stepItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
//   stepActive: { backgroundColor: 'rgba(62, 67, 70, 0.12)' },
//   stepTitle: { color: '#111', fontSize: 13, fontWeight: '600' },
//   stepMeta: { color: '#444', fontSize: 11, marginTop: 2 },
//   stepIndex: { color: '#000', fontSize: 12, marginLeft: 8, fontWeight: '700' },
// });


import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, ActivityIndicator, Linking, Animated, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { ScrollView } from 'react-native';
import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { GOOGLE_MAP_API_KEY } from '../constants/Constants';

// Simple bearing/distance helpers
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}
function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}
function computeBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ) - Math.sin(φ1) * Math.sin(φ2);
  const θ = Math.atan2(y, x);
  return (toDegrees(θ) + 360) % 360;
}
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function normalizeAngle(angle) {
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}


export default function ARNavigationScreen({ navigation, route }) {
  const isFocused = useIsFocused();
  const devices = useCameraDevices();
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [cameraDevice, setCameraDevice] = useState(null);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const target = route?.params?.target;
  const staticStart = route?.params?.start || null; 
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [position, setPosition] = useState(null);
  const lastPositionRef = useRef(null);
  const arrowRotation = useRef(new Animated.Value(0)).current;
  const [smoothBearing, setSmoothBearing] = useState(0);
  const [routeData, setRouteData] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [totalSteps, setTotalSteps] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(null);
  const [distanceToNextTurnMeters, setDistanceToNextTurnMeters] = useState(null); 
  const [nextTurnDirection, setNextTurnDirection] = useState(null); 
  const [isWrongDirection, setIsWrongDirection] = useState(false); 
  const [yellowArrowColor, setYellowArrowColor] = useState('#FFD700'); 
  const [arrowIcon, setArrowIcon] = useState('navigate');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [showMap, setShowMap] = useState(false); 
  const [showSteps, setShowSteps] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [userOrientation, setUserOrientation] = useState('North');
  const [arrowColor, setArrowColor] = useState('#5F93FB');
  const [guidanceMessage, setGuidanceMessage] = useState('');
  const compassRotation = useRef(new Animated.Value(0)).current;
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [offRouteDistance, setOffRouteDistance] = useState(null);
  const lastRouteFetchTime = useRef(0);
  const turnIndicatorPulse = useRef(new Animated.Value(1)).current; 
  const [arDestinationMarker, setArDestinationMarker] = useState(null);
  const [arPathPoints, setArPathPoints] = useState([]);
  const [arDistanceMarkers, setArDistanceMarkers] = useState([]);
  const [arTurnIndicators, setArTurnIndicators] = useState([]);
  const [showArMode, setShowArMode] = useState(true);

  function calculateHeadingFromMagnetometer(x, y) {
    if (x == null || y == null) return null;
    let heading = Math.atan2(y, x) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    return heading;
  }

  function calculateArDestinationMarker() {
    if (!position || !target) return null;
    
    const distance = haversineDistanceMeters(
      position.latitude, position.longitude,
      target.latitude, target.longitude
    );
    
    const bearing = computeBearing(
      position.latitude, position.longitude,
      target.latitude, target.longitude
    );
    
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    const relativeBearing = normalizeAngle(bearing - (deviceHeading || 0));
    const x = screenWidth / 2 + (relativeBearing / 90) * (screenWidth / 4);
    const y = screenHeight * 0.3; 
    
    return {
      x: Math.max(50, Math.min(screenWidth - 50, x)),
      y: Math.max(100, Math.min(screenHeight - 200, y)),
      distance: distance,
      bearing: bearing,
      visible: distance < 1000 
    };
  }

  function calculateArPathPoints() {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];
    
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    return routeCoordinates.slice(0, 10).map((coord, index) => {
      const distance = haversineDistanceMeters(
        position?.latitude || 0, position?.longitude || 0,
        coord.latitude, coord.longitude
      );
      
      const bearing = computeBearing(
        position?.latitude || 0, position?.longitude || 0,
        coord.latitude, coord.longitude
      );
      
      const relativeBearing = normalizeAngle(bearing - (deviceHeading || 0));
      const x = screenWidth / 2 + (relativeBearing / 90) * (screenWidth / 6);
      const y = screenHeight * 0.4 + (index * 20);
      
      return {
        x: Math.max(30, Math.min(screenWidth - 30, x)),
        y: Math.max(150, Math.min(screenHeight - 100, y)),
        distance: distance,
        visible: distance < 500
      };
    }).filter(point => point.visible);
  }

  function calculateArDistanceMarkers() {
    if (!position || !target) return [];
    
    const distance = haversineDistanceMeters(
      position.latitude, position.longitude,
      target.latitude, target.longitude
    );
    
    const markers = [];
    const intervals = [50, 100, 200, 500]; 
    
    intervals.forEach(interval => {
      if (distance > interval) {
        const bearing = computeBearing(
          position.latitude, position.longitude,
          target.latitude, target.longitude
        );
        
        const relativeBearing = normalizeAngle(bearing - (deviceHeading || 0));
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        
        const x = screenWidth / 2 + (relativeBearing / 90) * (screenWidth / 8);
        const y = screenHeight * 0.6;
        
        markers.push({
          x: Math.max(40, Math.min(screenWidth - 40, x)),
          y: Math.max(200, Math.min(screenHeight - 150, y)),
          distance: interval,
          visible: true
        });
      }
    });
    
    return markers;
  }

  function calculateArTurnIndicators() {
    if (!routeData?.steps || !position) return [];
    
    const indicators = [];
    const currentStep = routeData.steps[currentStepIndex || 0];
    
    if (currentStep) {
      const distance = haversineDistanceMeters(
        position.latitude, position.longitude,
        currentStep.end_location.lat, currentStep.end_location.lng
      );
      
      if (distance < 100) { 
        const bearing = computeBearing(
          position.latitude, position.longitude,
          currentStep.end_location.lat, currentStep.end_location.lng
        );
        
       
        const relativeBearing = normalizeAngle(bearing - (deviceHeading || 0));
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        
        const x = screenWidth / 2 + (relativeBearing / 90) * (screenWidth / 6);
        const y = screenHeight * 0.35; 
        
        const instruction = normalizeInstruction(currentStep.html_instructions);
        const arrowIcon = getArrowIcon(instruction, bearing, deviceHeading);
        
        indicators.push({
          x: Math.max(60, Math.min(screenWidth - 60, x)), 
          y: y,
          instruction: instruction,
          distance: distance,
          bearing: bearing,
          relativeBearing: relativeBearing,
          arrowIcon: arrowIcon, 
          visible: true
        });
      }
    }
    
    return indicators;
  }

  async function requestLocationPermission() {
    try {
      if (Platform.OS === 'android') {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        setHasLocationPermission(res === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Geolocation.requestAuthorization('whenInUse');
        setHasLocationPermission(status === 'granted');
      }
    } catch (e) {
      setHasLocationPermission(false);
    }
  }

  async function fetchRouteDirections(origin, destination) {
    try {
      if (!origin || !destination) {
        console.log('❌ Missing route points:', { 
          hasOrigin: !!origin, 
          hasDestination: !!destination 
        });
        return null;
      }

      console.log('🚀 Starting AR Navigation Route:');
      console.log('📍 START POINT (Current Location):', {
        latitude: origin.latitude,
        longitude: origin.longitude
      });
      console.log('🎯 END POINT (Destination):', {
        latitude: destination.latitude,
        longitude: destination.longitude
      });

      const API_KEY = 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE';

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&alternatives=true&key=${API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        let shortestRoute = data.routes[0];
        let shortestDistance = data.routes[0].legs[0].distance.value; 
        
        data.routes.forEach((route) => {
          const routeDistance = route.legs[0].distance.value;
          if (routeDistance < shortestDistance) {
            shortestDistance = routeDistance;
            shortestRoute = route;
          }
        });
        
        console.log('📏 Route Selection (AR Navigation Screen):', {
          totalRoutes: data.routes.length,
          selectedRouteDistance: (shortestDistance / 1000).toFixed(2) + ' km',
          routeType: 'SHORTEST PATH (Distance-based, Traffic Ignored)',
          note: 'Both Blue Arrow and Map Polyline will use this same shortest route'
        });
        
        const route = shortestRoute;
        const steps = route.legs[0].steps;
        setRouteData({ route, steps });
        setTotalSteps(steps.length || 0);

        
        const overviewPolyline = route.overview_polyline.points;
        const decodedCoordinates = decodePolyline(overviewPolyline);
        
        const uniqueCoordinates = [];
        let lastCoord = null;
        decodedCoordinates.forEach(coord => {
          if (!lastCoord || 
              Math.abs(coord.latitude - lastCoord.latitude) > 0.00001 || 
              Math.abs(coord.longitude - lastCoord.longitude) > 0.00001) {
            uniqueCoordinates.push(coord);
            lastCoord = coord;
          }
        });
        
        if (uniqueCoordinates.length > 0) {
          uniqueCoordinates[0] = {
            latitude: origin.latitude,
            longitude: origin.longitude
          };
          uniqueCoordinates[uniqueCoordinates.length - 1] = {
            latitude: destination.latitude,
            longitude: destination.longitude
          };
        }
        
        setRouteCoordinates(uniqueCoordinates);
        lastRouteFetchTime.current = Date.now(); 
        
        setIsOffRoute(false);
        setOffRouteDistance(null);

        console.log('🗺️ Route fetched successfully!');
        console.log('📊 Route Summary:', {
          startPoint: 'Current Location (GPS)',
          endPoint: 'Destination',
          totalSteps: steps.length,
          totalDistance: route.legs[0].distance.text,
          totalDuration: route.legs[0].duration.text,
          routeCoordinates: uniqueCoordinates.length,
          firstCoordinate: uniqueCoordinates[0] ? {
            lat: uniqueCoordinates[0].latitude.toFixed(6),
            lng: uniqueCoordinates[0].longitude.toFixed(6)
          } : 'N/A',
          lastCoordinate: uniqueCoordinates[uniqueCoordinates.length - 1] ? {
            lat: uniqueCoordinates[uniqueCoordinates.length - 1].latitude.toFixed(6),
            lng: uniqueCoordinates[uniqueCoordinates.length - 1].longitude.toFixed(6)
          } : 'N/A',
          routeType: 'SHORTEST PATH (Distance-based, Traffic Ignored)',
          note: 'Same routeCoordinates used by Blue Arrow and Map Polyline'
        });
        console.log('📍 Map will show SHORTEST route path (distance-based) from START to END with', uniqueCoordinates.length, 'coordinate points');
        console.log('✅ Blue Arrow and Map Polyline will follow the SAME shortest path');

        console.log('📋 All Route Steps:');
        steps.forEach((step, index) => {
          const instruction = step.html_instructions
            .replace(/<[^>]*>/g, '') 
            .replace(/&nbsp;/g, ' ') 
            .trim();

          console.log(`Step ${index + 1}:`, {
            instruction: instruction,
            distance: step.distance?.text || '0 m',
            duration: step.duration?.text || '0 min',
            startLocation: {
              lat: step.start_location.lat,
              lng: step.start_location.lng
            },
            endLocation: {
              lat: step.end_location.lat,
              lng: step.end_location.lng
            },
            maneuver: step.maneuver || 'none',
            travelMode: step.travel_mode || 'driving',
            isFirstStep: index === 0,
            isLastStep: index === steps.length - 1
          });
        });

        console.log('🎯 Navigation will start from Step 1 (first step)');

        return { route, steps };
      } else {
        console.log('❌ Route fetch failed:', data.status);
        return null;
      }
    } catch (error) {
      console.log('❌ Route API Error:', error);
      return null;
    }
  }

  function checkIfOffRoute(currentPos, routeCoords, threshold = 50) {
    if (!routeCoords || routeCoords.length === 0 || !currentPos) {
      return { isOffRoute: false, distance: null };
    }

    let minDistanceToRoute = Infinity;
    
    routeCoords.forEach(coord => {
      const dist = haversineDistanceMeters(
        currentPos.latitude, currentPos.longitude,
        coord.latitude, coord.longitude
      );
      if (dist < minDistanceToRoute) {
        minDistanceToRoute = dist;
      }
    });

    const isOff = minDistanceToRoute > threshold;
    
    if (isOff) {
      console.log('⚠️ OFF ROUTE DETECTED:', {
        distanceFromRoute: minDistanceToRoute.toFixed(1) + 'm',
        threshold: threshold + 'm',
        currentLocation: { lat: currentPos.latitude, lng: currentPos.longitude }
      });
    }

    return { isOffRoute: isOff, distance: minDistanceToRoute };
  }

  function getCurrentNavigationStep(currentPos, steps) {
    if (!steps || !currentPos) return null;

    if (currentStepIndex === null) {
      console.log('🎯 Starting with first step');
      return { ...steps[0], index: 0, distance: 0 };
    }

    let closestStep = null;
    let minDistance = Infinity;
    let currentStepIdx = currentStepIndex || 0;

    steps.forEach((step, index) => {
      const stepStart = step.start_location;
      const stepEnd = step.end_location;

      const distanceToStart = haversineDistanceMeters(
        currentPos.latitude, currentPos.longitude,
        stepStart.lat, stepStart.lng
      );

      const distanceToEnd = haversineDistanceMeters(
        currentPos.latitude, currentPos.longitude,
        stepEnd.lat, stepEnd.lng
      );

      const minStepDistance = Math.min(distanceToStart, distanceToEnd);

      if (minStepDistance < minDistance) {
        minDistance = minStepDistance;
        closestStep = { ...step, index, distance: minStepDistance };
        currentStepIdx = index;
      }
    });

    if (closestStep && minDistance < 30) {
      const nextStepIndex = currentStepIdx + 1;
      if (nextStepIndex < steps.length) {
        const nextStep = steps[nextStepIndex];
        console.log('🔄 Moving to next step:', {
          currentStepIndex: currentStepIdx,
          nextStepIndex: nextStepIndex,
          distanceToCurrent: minDistance.toFixed(1) + 'm'
        });
        return { ...nextStep, index: nextStepIndex, distance: minDistance };
      }
    }

    const finalStep = closestStep || steps[currentStepIdx] || steps[0];
    const finalIndex = closestStep ? currentStepIdx : (currentStepIdx || 0);

    console.log('📍 Current step:', {
      stepIndex: finalIndex,
      instruction: finalStep.html_instructions?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
      distanceToStep: minDistance.toFixed(1) + 'm'
    });

    return { ...finalStep, index: finalIndex, distance: minDistance };
  }

  function calculateMapRegion(startPoint, endPoint, routeCoords = []) {
    if (!startPoint || !endPoint) {
      return {
        latitude: startPoint?.latitude || endPoint?.latitude || 0,
        longitude: startPoint?.longitude || endPoint?.longitude || 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    let allLats = [startPoint.latitude, endPoint.latitude];
    let allLngs = [startPoint.longitude, endPoint.longitude];
    
    if (routeCoords && routeCoords.length > 0) {
      routeCoords.forEach(coord => {
        if (coord && coord.latitude && coord.longitude) {
          allLats.push(coord.latitude);
          allLngs.push(coord.longitude);
        }
      });
    }

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latDelta = (maxLat - minLat) * 1.8; 
    const lngDelta = (maxLng - minLng) * 1.8; 
    return {
      latitude: startPoint.latitude, 
      longitude: startPoint.longitude, 
      latitudeDelta: Math.max(latDelta, 0.005), 
      longitudeDelta: Math.max(lngDelta, 0.005), 
    };
  }

  function decodePolyline(encoded) {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  }

  function getDeviceOrientation(heading) {
    if (heading === null || heading === undefined) return 'North';

    let normalizedHeading = heading;
    while (normalizedHeading < 0) normalizedHeading += 360;
    while (normalizedHeading >= 360) normalizedHeading -= 360;

    if (normalizedHeading >= 337.5 || normalizedHeading < 22.5) return 'North';
    if (normalizedHeading >= 22.5 && normalizedHeading < 67.5) return 'Northeast';
    if (normalizedHeading >= 67.5 && normalizedHeading < 112.5) return 'East';
    if (normalizedHeading >= 112.5 && normalizedHeading < 157.5) return 'Southeast';
    if (normalizedHeading >= 157.5 && normalizedHeading < 202.5) return 'South';
    if (normalizedHeading >= 202.5 && normalizedHeading < 247.5) return 'Southwest';
    if (normalizedHeading >= 247.5 && normalizedHeading < 292.5) return 'West';
    if (normalizedHeading >= 292.5 && normalizedHeading < 337.5) return 'Northwest';
    return 'North';
  }

  function calculateRelativeDirection(targetBearing, deviceHeading) {
    if (targetBearing === null || deviceHeading === null) return 0;

    let relativeBearing = targetBearing - deviceHeading;

    while (relativeBearing < 0) relativeBearing += 360;
    while (relativeBearing >= 360) relativeBearing -= 360;

    return relativeBearing;
  }

  function getTurnMessage(instruction, targetBearing, deviceHeading) {
    if (!targetBearing || deviceHeading === null) return 'Calculating direction...';
    
    let relativeBearing = targetBearing - deviceHeading;
    
    while (relativeBearing > 180) relativeBearing -= 360;
    while (relativeBearing < -180) relativeBearing += 360;
    
    const lowerInstruction = instruction.toLowerCase();
    if (lowerInstruction.includes('left') || lowerInstruction.includes('turn left')) {
      return 'Turn left';
    } else if (lowerInstruction.includes('right') || lowerInstruction.includes('turn right')) {
      return 'Turn right';
    } else if (lowerInstruction.includes('u-turn') || lowerInstruction.includes('uturn')) {
      return 'Make U-turn';
    } else if (lowerInstruction.includes('straight') || lowerInstruction.includes('continue')) {
      return 'Move forward';
    }
    
    const absBearing = Math.abs(relativeBearing);
    
    if (absBearing <= 15) {
      return 'Move forward';
    } else if (absBearing >= 165) {
      return 'Move backward';
    } else if (relativeBearing > 0) {
      return 'Turn right';
    } else {
      return 'Turn left';
    }
  }

  function getArrowIcon(instruction, targetBearing, deviceHeading) {
    const lowerInstruction = instruction.toLowerCase();
    console.log('🔍 Checking instruction for arrow:', lowerInstruction);

    const relativeBearing = calculateRelativeDirection(targetBearing, deviceHeading);
    const orientation = getDeviceOrientation(deviceHeading);

    console.log('🧭 Device Orientation:', {
      deviceHeading: deviceHeading.toFixed(1),
      orientation: orientation,
      targetBearing: targetBearing?.toFixed(1),
      relativeBearing: relativeBearing.toFixed(1)
    });

    if (lowerInstruction.includes('left') || lowerInstruction.includes('turn left')) {
      console.log('⬅️ Setting LEFT arrow');
      return 'arrow-back';
    } else if (lowerInstruction.includes('right') || lowerInstruction.includes('turn right')) {
      console.log('➡️ Setting RIGHT arrow');
      return 'arrow-forward';
    } else if (lowerInstruction.includes('u-turn') || lowerInstruction.includes('uturn')) {
      console.log('⬇️ Setting U-TURN arrow');
      return 'arrow-down';
    } else if (lowerInstruction.includes('straight') || lowerInstruction.includes('continue') || lowerInstruction.includes('go straight')) {
      console.log('⬆️ Setting STRAIGHT arrow');
      return 'arrow-up';
    } else {
      if (relativeBearing >= 315 || relativeBearing < 45) {
        console.log('⬆️ Setting FORWARD arrow (North)');
        return 'arrow-up';
      } else if (relativeBearing >= 45 && relativeBearing < 135) {
        console.log('➡️ Setting RIGHT arrow (East)');
        return 'arrow-forward';
      } else if (relativeBearing >= 135 && relativeBearing < 225) {
        console.log('⬇️ Setting BACK arrow (South)');
        return 'arrow-down';
      } else if (relativeBearing >= 225 && relativeBearing < 315) {
        console.log('⬅️ Setting LEFT arrow (West)');
        return 'arrow-back';
      } else {
        console.log('🧭 Setting DEFAULT navigate arrow');
        return 'navigate';
      }
    }
  }

  function normalizeInstruction(html) {
    if (!html) return '';
    try {
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    } catch (e) {
      return String(html);
    }
  }

  function iconForStep(step) {
    const m = (step?.maneuver || '').toLowerCase();
    const txt = normalizeInstruction(step?.html_instructions || '');
    if (m.includes('left') || txt.includes('left')) return 'arrow-back';
    if (m.includes('right') || txt.includes('right')) return 'arrow-forward';
    if (m.includes('uturn') || m.includes('u-turn')) return 'arrow-down';
    if (m.includes('straight') || txt.includes('continue') || txt.includes('straight')) return 'arrow-up';
    return 'navigate';
  }

  useEffect(() => {
    console.log('🎯 Fetching STARTING POINT (Current Location)...');
    Geolocation.getCurrentPosition(
      pos => {
        console.log('✅ STARTING POINT (Current Location) Received:', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          note: 'This is your starting point for AR navigation'
        });
        setPosition(pos.coords);
        lastPositionRef.current = pos.coords;

        if (pos.coords.heading !== undefined && pos.coords.heading !== null) {
          setDeviceHeading(pos.coords.heading);
          const orientation = getDeviceOrientation(pos.coords.heading);
          setUserOrientation(orientation);
        }
      },
      err => {
        console.log('❌ Initial GPS Error:', err);
        setTimeout(() => {
          console.log('🔄 Retrying initial location fetch...');
          Geolocation.getCurrentPosition(
            pos => setPosition(pos.coords),
            err => console.log('❌ Retry GPS Error:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
          );
        }, 3000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    console.log('📱 Using magnetometer for device orientation (fallback to GPS)');
    try {
      setUpdateIntervalForType(SensorTypes.magnetometer, 100);
    } catch (e) { }

    let subscription = magnetometer.subscribe(({ x, y, z }) => {
      const heading = calculateHeadingFromMagnetometer(x, y);
      if (heading != null) {
        setDeviceHeading(heading);
        const orientation = getDeviceOrientation(heading);
        setUserOrientation(orientation);
      }
    });

    return () => {
      try { subscription && subscription.unsubscribe && subscription.unsubscribe(); } catch (e) { }
    };
  }, []);

  useEffect(() => {
    if (position && target) {
      console.log('🗺️ Fetching route from Current Location to Destination');
      console.log('📍 Current Location (START):', {
        lat: position.latitude,
        lng: position.longitude
      });
      console.log('🎯 Destination (END):', {
        lat: target.latitude,
        lng: target.longitude
      });
      fetchRouteDirections(position, target);
    } else {
      if (!position) {
        console.log('⏳ Waiting for GPS location...');
      }
      if (!target) {
        console.log('⏳ Waiting for destination...');
      }
    }
  }, [position, target]);

  useEffect(() => {
    if (!position || !routeCoordinates || routeCoordinates.length === 0) {
      setIsOffRoute(false);
      setOffRouteDistance(null);
      return;
    }

    const { isOffRoute: offRoute, distance: routeDistance } = checkIfOffRoute(position, routeCoordinates, 50);
    
    setIsOffRoute(offRoute);
    setOffRouteDistance(routeDistance);

    if (offRoute && target) {
      const now = Date.now();
      if (now - lastRouteFetchTime.current > 10000) {
        console.log('🔄 Auto re-routing due to off route...');
        lastRouteFetchTime.current = now;
        fetchRouteDirections(position, target);
      }
    } else {
      lastRouteFetchTime.current = 0;
    }
  }, [position, routeCoordinates, target]);

  useEffect(() => {
    if (isFocused && !hasCameraPermission) {
      requestCameraPermission();
    }
  }, [isFocused, hasCameraPermission, requestCameraPermission]);

  useEffect(() => {
    async function loadDevice() {
      if (!hasCameraPermission || !isFocused) return;
      try {
        setLoadingDevice(true);
        let device = devices?.back ?? null;
        if (!device) {
          const available = await Camera.getAvailableCameraDevices();
          device = available.find(d => d.position === 'back') || available[0] || null;
        }
        setCameraDevice(device || null);
      } catch (e) {
        setCameraDevice(null);
      } finally {
        setLoadingDevice(false);
      }
    }
    loadDevice();
  }, [hasCameraPermission, isFocused, devices]);

  useEffect(() => {
    if (!hasLocationPermission) return;

    console.log('🔄 Starting GPS tracking...');

    const watchId = Geolocation.watchPosition(
      pos => {
        console.log('📍 GPS Update Received:', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: new Date(pos.timestamp).toLocaleTimeString()
        });

        setPosition(pos.coords);
        lastPositionRef.current = pos.coords;

        if (pos.coords.heading !== undefined && pos.coords.heading !== null) {
          setDeviceHeading(pos.coords.heading);
          const orientation = getDeviceOrientation(pos.coords.heading);
          setUserOrientation(orientation);
          console.log('🧭 Device Heading Updated:', pos.coords.heading.toFixed(1), 'Orientation:', orientation);
        }
      },
      err => {
        console.log('❌ GPS Error:', err);
        setTimeout(() => {
          console.log('🔄 Retrying GPS tracking...');
        }, 2000);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0.1, 
        interval: 100, 
        fastestInterval: 50, 
        timeout: 10000,
        maximumAge: 1000
      },
    );

    console.log('✅ GPS tracking started with watchId:', watchId);

    return () => {
      console.log('🛑 Stopping GPS tracking...');
      Geolocation.clearWatch(watchId);
    };
  }, [hasLocationPermission]); 

  const { bearingToTarget, distance, movementBearing, turnInstruction } = useMemo(() => {
    const current = position || staticStart;
    if (!current) {
      return { bearingToTarget: null, distance: null, movementBearing: null, turnInstruction: 'Location needed' };
    }

    if (routeData && routeData.steps && routeCoordinates && routeCoordinates.length > 0) {
      let nextRoutePoint = null;
      let nextRoutePointIndex = -1;
      let minDistanceToRoute = Infinity;
      
      routeCoordinates.forEach((coord, index) => {
        const dist = haversineDistanceMeters(
          current.latitude, current.longitude,
          coord.latitude, coord.longitude
        );
        if (dist < minDistanceToRoute && index < routeCoordinates.length - 1) {
          minDistanceToRoute = dist;
          nextRoutePointIndex = index + 1; 
        }
      });
      
      if (nextRoutePointIndex > 0 && nextRoutePointIndex < routeCoordinates.length) {
        nextRoutePoint = routeCoordinates[nextRoutePointIndex];
      } else if (routeCoordinates.length > 1) {
        nextRoutePoint = routeCoordinates[1];
      }
      
      let nextStepBearing = null;
      if (nextRoutePoint) {
        nextStepBearing = computeBearing(
          current.latitude, current.longitude,
          nextRoutePoint.latitude, nextRoutePoint.longitude
        );
        console.log('✅ Blue Arrow using routeCoordinates path (same as Map Polyline):', {
          currentPoint: { lat: current.latitude.toFixed(6), lng: current.longitude.toFixed(6) },
          nextRoutePoint: { lat: nextRoutePoint.latitude.toFixed(6), lng: nextRoutePoint.longitude.toFixed(6) },
          bearing: nextStepBearing.toFixed(1) + '°',
          routePointIndex: nextRoutePointIndex,
          totalRoutePoints: routeCoordinates.length
        });
      }

      if (!nextStepBearing && routeCoordinates.length > 1) {
        nextStepBearing = computeBearing(
          current.latitude, current.longitude,
          routeCoordinates[1].latitude, routeCoordinates[1].longitude
        );
      }
      
      let totalRouteDistance = 0;
      for (let i = 0; i < routeCoordinates.length - 1; i++) {
        totalRouteDistance += haversineDistanceMeters(
          routeCoordinates[i].latitude, routeCoordinates[i].longitude,
          routeCoordinates[i + 1].latitude, routeCoordinates[i + 1].longitude
        );
      }
      
      const currentStep = getCurrentNavigationStep(current, routeData.steps);
      if (currentStep) {
        setCurrentStep(currentStep);
        setCurrentStepIndex(currentStep.index);
      }
      
      const instruction = currentStep?.html_instructions
        ?.replace(/<[^>]*>/g, '') 
        .replace(/&nbsp;/g, ' ') 
        .trim() || 'Continue';
      
      const stepDistance = currentStep?.distance?.text || '0 m';
      const stepDistanceMeters = currentStep?.distance?.value || 0;
      setDistanceToNextTurn(stepDistance);
      setDistanceToNextTurnMeters(stepDistanceMeters);


      let distanceToTurnMeters = null;
      let turnDirectionFromRoute = null;
      
      if (nextRoutePoint && routeCoordinates.length > nextRoutePointIndex + 1) {
        const lookAheadDistance = 200; 
        let accumulatedDistance = 0;
        let prevBearing = nextStepBearing;
        
        for (let i = nextRoutePointIndex; i < routeCoordinates.length - 1 && accumulatedDistance < lookAheadDistance; i++) {
          const currentCoord = routeCoordinates[i];
          const nextCoord = routeCoordinates[i + 1];
          
          const segmentDistance = haversineDistanceMeters(
            currentCoord.latitude, currentCoord.longitude,
            nextCoord.latitude, nextCoord.longitude
          );
          accumulatedDistance += segmentDistance;
          
          const segmentBearing = computeBearing(
            currentCoord.latitude, currentCoord.longitude,
            nextCoord.latitude, nextCoord.longitude
          );
          
          const bearingChange = Math.abs(normalizeAngle(segmentBearing - prevBearing));
          
          if (bearingChange > 30 && bearingChange < 150) {
            const distanceFromCurrent = haversineDistanceMeters(
              current.latitude, current.longitude,
              nextCoord.latitude, nextCoord.longitude
            );
            
            distanceToTurnMeters = distanceFromCurrent;
            
            const relativeBearing = normalizeAngle(segmentBearing - prevBearing);
            if (relativeBearing > 0 && relativeBearing < 180) {
              turnDirectionFromRoute = 'right';
            } else {
              turnDirectionFromRoute = 'left';
            }
            
            console.log('🔄 Found turn in routeCoordinates:', {
              turnPoint: { lat: nextCoord.latitude.toFixed(6), lng: nextCoord.longitude.toFixed(6) },
              distance: distanceToTurnMeters.toFixed(1) + 'm',
              bearingChange: bearingChange.toFixed(1) + '°',
              turnDirection: turnDirectionFromRoute
            });
            
            break;
          }
          
          prevBearing = segmentBearing;
        }
      }
      
      if (distanceToTurnMeters === null && nextRoutePoint) {
        distanceToTurnMeters = haversineDistanceMeters(
          current.latitude, current.longitude,
          nextRoutePoint.latitude, nextRoutePoint.longitude
        );
        console.log('⚠️ Using routeCoordinates next point as fallback (NOT currentStep):', {
          distance: distanceToTurnMeters.toFixed(1) + 'm',
          nextPoint: { lat: nextRoutePoint.latitude.toFixed(6), lng: nextRoutePoint.longitude.toFixed(6) }
        });
      }
      
      setDistanceToNextTurnMeters(distanceToTurnMeters);

      const lowerInstruction = instruction.toLowerCase();
      let turnDir = 'straight';
      let requiredBearing = nextStepBearing; 
        
      if (turnDirectionFromRoute) {
        turnDir = turnDirectionFromRoute;
        console.log('✅ Using turnDir from routeCoordinates (shortest path):', turnDir);
      } else {
        if (nextStepBearing !== null && deviceHeading !== null) {
          const relativeBearing = normalizeAngle(nextStepBearing - deviceHeading);
          const absRel = Math.abs(relativeBearing);
          
          if (absRel <= 15) {
            turnDir = 'straight';
          } else if (relativeBearing > 0 && relativeBearing < 180) {
            turnDir = 'right';
          } else {
            turnDir = 'left';
          }
          console.log('✅ Using turnDir from routeCoordinates bearing (shortest path):', turnDir);
        } else {
          turnDir = 'straight';
          console.log('⚠️ No turn direction found, defaulting to straight (routeCoordinates path)');
        }
      }
      
     
      let nextStepTurnDir = null;
      let nextStepDistance = null;
      if (currentStep && currentStep.index + 1 < routeData.steps.length) {
          const nextStep = routeData.steps[currentStep.index + 1];
          const nextStepInstruction = nextStep.html_instructions
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim()
            .toLowerCase();
          
          if (nextStepInstruction.includes('left') || nextStepInstruction.includes('turn left')) {
            nextStepTurnDir = 'left';
          } else if (nextStepInstruction.includes('right') || nextStepInstruction.includes('turn right')) {
            nextStepTurnDir = 'right';
          } else if (nextStepInstruction.includes('u-turn') || nextStepInstruction.includes('uturn')) {
            nextStepTurnDir = 'uturn';
          }
          
          if (nextStepTurnDir) {
            nextStepDistance = haversineDistanceMeters(
              current.latitude, current.longitude,
              nextStep.end_location.lat, nextStep.end_location.lng
            );
          }
        }
        

        let actualTurnDir = turnDir; 
        let wrongDirection = false;
        
      if (deviceHeading !== null && requiredBearing !== null) {
        let relativeBearing = normalizeAngle(requiredBearing - deviceHeading);
        
        let userMovementBearing = null;
        if (lastPositionRef.current && position) {
          const moved = haversineDistanceMeters(
            lastPositionRef.current.latitude, 
            lastPositionRef.current.longitude,
            position.latitude, 
            position.longitude
          );
          if (moved > 2) { 
            userMovementBearing = computeBearing(
              lastPositionRef.current.latitude,
              lastPositionRef.current.longitude,
              position.latitude,
              position.longitude
            );
          }
        }
        
        const absRel = Math.abs(relativeBearing);
        
        if (userMovementBearing !== null) {
          const movementDiff = normalizeAngle(requiredBearing - userMovementBearing);
          const absMovementDiff = Math.abs(movementDiff);
          
          if (absMovementDiff > 60) {
            wrongDirection = true;
            actualTurnDir = turnDir;
          } else {
            wrongDirection = false;
            actualTurnDir = turnDir;
          }
        } else {
          if (absRel <= 30) {
            actualTurnDir = turnDir;
            wrongDirection = false;
          } else if (absRel >= 150) {
            wrongDirection = true;
            actualTurnDir = turnDir;
          } else {
    
            if (turnDir === 'left' && relativeBearing > 0 && relativeBearing < 90) {
              wrongDirection = true;
            } else if (turnDir === 'right' && relativeBearing < 0 && relativeBearing > -90) {
              wrongDirection = true;
            } else {
              wrongDirection = false;
            }
            actualTurnDir = turnDir;
          }
        }
      }
      

      let arrowToShow = actualTurnDir;
      let distanceForArrow = distanceToTurnMeters;
      
      if (turnDir === 'straight') {
        arrowToShow = 'straight';
        distanceForArrow = null; 
      } else {
        if (distanceToTurnMeters > 20) {
          arrowToShow = 'straight';
          distanceForArrow = null;
        } else {
          arrowToShow = actualTurnDir;
          distanceForArrow = distanceToTurnMeters;
        }
      }
      
      setNextTurnDirection(arrowToShow);
      setDistanceToNextTurnMeters(distanceForArrow);
      setIsWrongDirection(wrongDirection);
      
      if (wrongDirection) {
        setYellowArrowColor('#FF4444'); 
      } else {
        setYellowArrowColor('#FFD700'); 
      }

      let finalTurnMessage = null;
      if (turnDirectionFromRoute) {
        finalTurnMessage = turnDirectionFromRoute === 'left' ? 'Turn left' : 'Turn right';
        console.log('✅ Using turn direction from routeCoordinates (shortest path):', finalTurnMessage);
      } else {
        if (nextStepBearing !== null && deviceHeading !== null) {
          const relativeBearing = normalizeAngle(nextStepBearing - deviceHeading);
          if (Math.abs(relativeBearing) <= 15) {
            finalTurnMessage = 'Move forward';
          } else if (relativeBearing > 0 && relativeBearing < 180) {
            finalTurnMessage = 'Turn right';
          } else {
            finalTurnMessage = 'Turn left';
          }
        } else {
          finalTurnMessage = 'Continue';
        }
      }
      
      const turnMessage = finalTurnMessage || 'Continue';
      const icon = getArrowIcon(instruction, nextStepBearing, deviceHeading);
      setArrowIcon(icon);

      console.log('🛣️ Road Navigation (Shortest Path - routeCoordinates):', {
        stepIndex: currentStep?.index + 1 || 'N/A',
        totalSteps: routeData.steps.length,
        instruction: instruction,
        turnMessage: turnMessage,
        distance: stepDistance,
        arrowIcon: icon,
        bearing: nextStepBearing?.toFixed(1),
        routeCoordinatesPath: '✅ Using same routeCoordinates as Map Polyline (SHORTEST PATH)',
        turnDirectionSource: turnDirectionFromRoute ? 'routeCoordinates (shortest)' : 'bearing-based',
        distanceToTurn: distanceToTurnMeters ? distanceToTurnMeters.toFixed(1) + 'm' : 'N/A'
      });

      const routeDistance = totalRouteDistance || routeData.route.legs[0].distance.value;
      const routeDistanceText = routeDistance < 1000 
        ? `${routeDistance.toFixed(0)} m` 
        : `${(routeDistance / 1000).toFixed(2)} km`;

      console.log('📏 Distance Comparison (Shortest Path):', {
        routeCoordinatesDistance: routeDistanceText,
        routeCoordinatesDistanceMeters: routeDistance.toFixed(0) + 'm',
        currentLocation: { lat: current.latitude, lng: current.longitude },
        targetLocation: { lat: target.latitude, lng: target.longitude },
        note: 'Using routeCoordinates distance (shortest path)'
      });

      let formattedInstruction = '';
      if (distanceToTurnMeters && distanceToTurnMeters < 1000) {
        const meters = Math.round(distanceToTurnMeters);
        if (meters <= 0) {
          formattedInstruction = turnMessage;
        } else if (meters < 20) {
          formattedInstruction = `${turnMessage} now`;
        } else {
          formattedInstruction = `After ${meters} meters ${turnMessage.toLowerCase()}`;
        }
      } else if (distanceToTurnMeters && distanceToTurnMeters >= 1000) {
        const km = (distanceToTurnMeters / 1000).toFixed(1);
        formattedInstruction = `After ${km} km ${turnMessage.toLowerCase()}`;
      } else {
        formattedInstruction = turnMessage;
      }

      return {
        bearingToTarget: nextStepBearing,
        distance: routeDistance, 
        movementBearing: null,
        turnInstruction: formattedInstruction || turnMessage
      };
    }

    const bTarget = computeBearing(current.latitude, current.longitude, target.latitude, target.longitude);
    const d = haversineDistanceMeters(current.latitude, current.longitude, target.latitude, target.longitude);

    let moveBearing = null;
    let instruction = 'Head towards the arrow';
    const last = lastPositionRef.current;
    if (last && position) {
      const moved = haversineDistanceMeters(last.latitude, last.longitude, position.latitude, position.longitude);
      if (moved > 0.2) {
        moveBearing = computeBearing(last.latitude, last.longitude, position.latitude, position.longitude);
        const delta = normalizeAngle(bTarget - moveBearing);
        const absDelta = Math.abs(delta);
        if (absDelta <= 15) instruction = 'Go straight';
        else if (delta > 0) instruction = `Turn right ${absDelta.toFixed(0)}°`;
        else instruction = `Turn left ${absDelta.toFixed(0)}°`;
      }
    }

    const turnMessage = getTurnMessage(instruction, bTarget, deviceHeading);
    const icon = getArrowIcon(instruction, bTarget, deviceHeading);
    setArrowIcon(icon);

    console.log('🧭 Direct Navigation (Fallback):', {
      currentLocation: { lat: current.latitude, lng: current.longitude },
      targetLocation: { lat: target.latitude, lng: target.longitude },
      bearingToTarget: bTarget?.toFixed(1),
      directDistance: d?.toFixed(1) + 'm',
      instruction: instruction,
      turnMessage: turnMessage,
      arrowIcon: icon,
      note: 'Using direct distance (straight line) - route data not available'
    });

    return { bearingToTarget: bTarget, distance: d, movementBearing: moveBearing, turnInstruction: turnMessage };
  }, [position, staticStart, target, routeData, deviceHeading, currentStepIndex, routeCoordinates]);

  useEffect(() => {
    if (isOffRoute) {
      setArrowColor('#FF4444'); 
      setGuidanceMessage(`⚠️ Wrong Direction - ${offRouteDistance ? Math.round(offRouteDistance) : '--'}m off route. Re-routing...`);
      console.log('🔴 Off Route Alert:', {
        distanceFromRoute: offRouteDistance?.toFixed(1) + 'm',
        message: 'Re-routing...'
      });
    } else {
      setArrowColor('#5F93FB'); 
    }
  }, [isOffRoute, offRouteDistance]);

  useEffect(() => {
    if (distanceToNextTurnMeters && distanceToNextTurnMeters < 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(turnIndicatorPulse, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(turnIndicatorPulse, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      turnIndicatorPulse.setValue(1);
    }
  }, [distanceToNextTurnMeters]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const relativeBearing = (bearingToTarget != null && deviceHeading != null)
        ? calculateRelativeDirection(bearingToTarget, deviceHeading)
        : null;
      const stepInfo = currentStepIndex != null && totalSteps
        ? `${currentStepIndex + 1}/${totalSteps}`
        : '--';
      console.log('🧭 AR Nav Status:', {
        step: stepInfo,
        instruction: turnInstruction || 'Waiting for route...',
        distance: distanceLabel,
        deviceHeading: deviceHeading != null ? `${deviceHeading.toFixed(1)}°` : '--',
        orientation: userOrientation,
        targetBearing: bearingToTarget != null ? `${bearingToTarget.toFixed(1)}°` : '--',
        relativeBearing: relativeBearing != null ? `${relativeBearing.toFixed(1)}°` : '--',
        arrowIcon: arrowIcon,
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [currentStepIndex, totalSteps, turnInstruction, distanceLabel, deviceHeading, userOrientation, bearingToTarget, arrowIcon]);

  useEffect(() => {
    if (bearingToTarget !== null && deviceHeading !== null) {
      const relativeBearing = calculateRelativeDirection(bearingToTarget, deviceHeading);
      const targetRotation = relativeBearing;
      const currentRotation = smoothBearing;

      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > 180) rotationDiff -= 360;
      if (rotationDiff < -180) rotationDiff += 360;

      const newRotation = currentRotation + rotationDiff;
      setSmoothBearing(newRotation);
      let guidance = 'Align with target';
      const normalized = ((relativeBearing % 360) + 360) % 360; // 0..359
      const absRel = Math.abs(((normalized + 540) % 360) - 180); // 0..180
      if (absRel <= 15) guidance = 'Move forward';
      else if (absRel >= 165) guidance = 'Move backward';
      else if (normalized > 0 && normalized < 180) guidance = 'Turn right';
      else guidance = 'Turn left';
      setGuidanceMessage(guidance);

      Animated.timing(arrowRotation, {
        toValue: newRotation,
        duration: 300, 
        useNativeDriver: true,
      }).start();
    }
  }, [bearingToTarget, deviceHeading]);

  useEffect(() => {
    if (deviceHeading !== null && deviceHeading !== undefined) {
      Animated.timing(compassRotation, {
        toValue: -deviceHeading,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [deviceHeading]);

  useEffect(() => {
    if (position && deviceHeading !== null) {
      const destMarker = calculateArDestinationMarker();
      setArDestinationMarker(destMarker);
      
      const pathPoints = calculateArPathPoints();
      setArPathPoints(pathPoints);
      
      const distanceMarkers = calculateArDistanceMarkers();
      setArDistanceMarkers(distanceMarkers);
      
      const turnIndicators = calculateArTurnIndicators();
      setArTurnIndicators(turnIndicators);
    }
  }, [position, deviceHeading, routeCoordinates, currentStepIndex, routeData]);


  const distanceLabel = distance != null ? `${distance < 1000 ? distance.toFixed(0) + ' m' : (distance / 1000).toFixed(2) + ' km'}` : '--';
  const showCamera = cameraDevice && hasCameraPermission && isFocused;
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const cameraHeight = showMap ? screenHeight * 0.7 : screenHeight;
  const mapHeight = screenHeight * 0.55;

  return (
    <View style={styles.container}>
      <View style={[styles.cameraContainer, { height: cameraHeight }]}>
        {showCamera ? (
          <Camera 
            style={StyleSheet.absoluteFill} 
            device={cameraDevice} 
            isActive={true}
            video={false}
            audio={false}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
            {loadingDevice ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 18 }}>📷 Street View Mode</Text>
            )}
          </View>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity style={[styles.backBtn, { top: 60 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.roadArrowContainer, { 
            bottom: showMap ? 120 : 180,
            alignSelf: 'center',
          }]}>
            <View style={[styles.roadInfoBox, isOffRoute && styles.roadInfoBoxOffRoute]}>
              <Text style={[styles.roadDistanceText, isOffRoute && styles.roadDistanceTextOffRoute]}>
                {distanceLabel}
              </Text>
              <Text style={[styles.roadInstructionText, isOffRoute && styles.roadInstructionTextOffRoute]} numberOfLines={2}>
                {isOffRoute ? `⚠️ Wrong Direction - ${offRouteDistance ? Math.round(offRouteDistance) : '--'}m off route` : (turnInstruction || guidanceMessage)}
              </Text>
              {isOffRoute && (
                <View style={styles.roadOffRouteWarning}>
                  <Ionicons name="warning" size={20} color="#FF4444" />
                  <Text style={styles.roadOffRouteText}>
                    Re-routing...
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.destinationArrowContainer, { 
            top: 60, 
            right: 16, 
            left: 'auto',
            bottom: 'auto',
            zIndex: 10 
          }]}>
            <View style={styles.destinationLabelContainer}>
              <Text style={styles.destinationLabel}>Destination</Text>
            </View>
            <Ionicons name="flag" size={32} color="#FF4444" />
            <Text style={styles.destinationArrowDistance}>{distanceLabel}</Text>
          </View>

          <TouchableOpacity
            style={[styles.mapToggleBtn, { 
              top: 60, 
              right: 90, 
              left: 'auto',
              bottom: 'auto',
            }]}
            onPress={() => setShowMap(!showMap)}
            activeOpacity={0.7}
          >
            <Ionicons name={showMap ? "eye" : "map"} size={24} color="#fff" />
            <Text style={styles.mapToggleText}>{showMap ? "Hide Map" : "Show Map"}</Text>
          </TouchableOpacity>

          {nextTurnDirection && bearingToTarget !== null && deviceHeading !== null && (
            <Animated.View style={[styles.yellowTurnArrowContainer, {
              transform: [
                { scale: turnIndicatorPulse }
                // NO ROTATION - Arrow stays fixed, only shows direction
              ]
            }]}>
              <View style={styles.yellowTurnArrowBox}>
                <View style={styles.yellowArrowCircleContainer}>
                  <View style={[
                    styles.yellowArrowCircle,
                    isWrongDirection && styles.yellowArrowCircleRed
                  ]} />
                  
                  {nextTurnDirection === 'left' && (
                    <Ionicons 
                      name="arrow-back" 
                      size={80} 
                      color={yellowArrowColor} 
                      style={styles.yellowArrowIconStatic}
                    />
                  )}
                  {nextTurnDirection === 'right' && (
                    <Ionicons 
                      name="arrow-forward" 
                      size={80} 
                      color={yellowArrowColor} 
                      style={styles.yellowArrowIconStatic}
                    />
                  )}
                  {nextTurnDirection === 'straight' && (
                    <Ionicons 
                      name="arrow-up" 
                      size={80} 
                      color={yellowArrowColor} 
                      style={styles.yellowArrowIconStatic}
                    />
                  )}
                  {nextTurnDirection === 'uturn' && (
                    <Ionicons 
                      name="return-down-back" 
                      size={80} 
                      color={yellowArrowColor} 
                      style={styles.yellowArrowIconStatic}
                    />
                  )}
                </View>
                
                {isWrongDirection && (
                  <View style={styles.yellowArrowWarningBox}>
                    <Ionicons name="warning" size={18} color="#FF4444" />
                    <Text style={styles.yellowArrowWarningText}>
                      Wrong Direction!
                    </Text>
                  </View>
                )}
                
                {nextTurnDirection !== 'straight' && distanceToNextTurnMeters && (
                  <Text style={styles.yellowArrowDistance}>
                    {Math.round(distanceToNextTurnMeters)} m
                  </Text>
                )}
              </View>
            </Animated.View>
          )}

          {false && showArMode && (
            <>
              {arDestinationMarker && arDestinationMarker.visible && (
                <View style={[styles.arDestinationMarker, { 
                  left: arDestinationMarker.x - 30, 
                  top: arDestinationMarker.y - 30 
                }]}>
                  <View style={styles.arMarkerContainer}>
                    <Ionicons name="flag" size={40} color="#ff4444" />
                    <View style={styles.arMarkerPulse} />
                  </View>
                  <Text style={styles.arMarkerText}>
                    {arDestinationMarker.distance < 1000 
                      ? `${arDestinationMarker.distance.toFixed(0)}m` 
                      : `${(arDestinationMarker.distance/1000).toFixed(1)}km`
                    }
                  </Text>
                </View>
              )}

              {arPathPoints.map((point, index) => (
                <View key={`path-${index}`} style={[styles.arPathPoint, { 
                  left: point.x - 8, 
                  top: point.y - 8 
                }]}>
                  <View style={styles.arPathDot} />
                  <View style={styles.arPathGlow} />
                </View>
              ))}

              {arDistanceMarkers.map((marker, index) => (
                <View key={`distance-${index}`} style={[styles.arDistanceMarker, { 
                  left: marker.x - 25, 
                  top: marker.y - 15 
                }]}>
                  <View style={styles.arDistanceContainer}>
                    <Text style={styles.arDistanceText}>{marker.distance}m</Text>
                    <View style={styles.arDistanceLine} />
                  </View>
                </View>
              ))}

              {arTurnIndicators.map((indicator, index) => {
                const turnArrowIcon = indicator.arrowIcon || 'arrow-forward';
                
                return (
                  <View key={`turn-${index}`} style={[styles.arTurnIndicator, { 
                    left: indicator.x - 50, 
                    top: indicator.y - 40,
                    alignSelf: 'center',
                  }]}>
                    <View style={styles.nextTurnLabelContainer}>
                      <Text style={styles.nextTurnLabel}>NEXT TURN</Text>
                    </View>
                    <View style={styles.arTurnContainer}>
                      <Ionicons name={turnArrowIcon} size={35} color="#00ff88" />
                      <View style={styles.arTurnPulse} />
                    </View>
                    <Text style={styles.arTurnText} numberOfLines={2}>
                      {indicator.instruction}
                    </Text>
                    <Text style={styles.arTurnDistance}>
                      {indicator.distance.toFixed(0)}m
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </View>
      {showMap && (
        <View style={[styles.mapContainer, { height: mapHeight }]}>
          <View style={{ flex: 1 }}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={calculateMapRegion(position, target, routeCoordinates)}
              region={calculateMapRegion(position, target, routeCoordinates)}
              showsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={false}
              showsScale={false}
              showsBuildings={true}
              showsTraffic={false}
              rotateEnabled={false}
              pitchEnabled={false}
              scrollEnabled={true}
              zoomEnabled={true}
              followsUserLocation={true}
              mapType="standard"
              key={`map-${position?.latitude}-${position?.longitude}`}
            >
              {position && target && (
                <MapViewDirections
                  key={`route-${position.latitude}-${position.longitude}-${target.latitude}-${target.longitude}`}
                  origin={position}
                  destination={target}
                  apikey={GOOGLE_MAP_API_KEY}
                  strokeWidth={6}
                  strokeColor="#5F93FB"
                  optimizeWaypoints={true}
                  onReady={(result) => {
                    if (result && result.coordinates && result.coordinates.length > 0) {
                      setRouteCoordinates(result.coordinates);
                      console.log('📍 Route updated with', result.coordinates.length, 'points');
                    }
                  }}
                />
              )}
              
              {position && (
                <Marker
                  coordinate={{
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }}
                  title="Start Point (Current Location)"
                  description="Your starting location"
                  pinColor="green"
                />
              )}
              
              {target && (
                <Marker
                  coordinate={{
                    latitude: target.latitude,
                    longitude: target.longitude,
                  }}
                  title="Destination (End Point)"
                  description="Your destination"
                  pinColor="red"
                />
              )}
            </MapView>

            <TouchableOpacity
              style={styles.stepsToggleBtn}
              onPress={() => setShowSteps(!showSteps)}
              activeOpacity={0.7}
            >
              <Ionicons name={showSteps ? "map" : "list"} size={22} color="#fff" />
              <Text style={styles.stepsToggleText}>{showSteps ? "Map" : "Steps"}</Text>
            </TouchableOpacity>
          </View>

          {showSteps && (
            <View style={[styles.stepsContainer, { height: mapHeight * 0.6 }]}>
              <View style={styles.stepsHeader}>
                <Text style={styles.mapInfoText}>Total Steps: {totalSteps ? `${totalSteps}` : 'Loading...'}</Text>
                <TouchableOpacity onPress={() => setShowSteps(false)}>
                  <Ionicons name="close" size={20} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: 12 }}>
                {(routeData?.steps || []).map((s, idx) => {
                  const isActive = idx === currentStepIndex;
                  const instr = normalizeInstruction(s.html_instructions);
                  const ico = iconForStep(s);
                  return (
                    <View key={`step-${idx}`} style={[styles.stepItem, isActive ? styles.stepActive : null]}>
                      <Ionicons name={ico} size={20} color={isActive ? '#0af' : '#9ad'} />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.stepTitle]} numberOfLines={2}>
                          {instr || 'Proceed'}
                        </Text>
                        <Text style={styles.stepMeta}>
                          {s.distance?.text || '--'}{s.duration?.text ? ` • ${s.duration.text}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.stepIndex, isActive ? { color: '#0af' } : null]}>{idx + 1}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  cameraContainer: { flex: 1 },
  cameraPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  backBtn: { 
    position: 'absolute', 
    left: 16, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    padding: 12, 
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoBox: { 
    position: 'absolute', 
    top: 50, 
    right: 16, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 6,
  },
  mapToggleBtn: { 
    position: 'absolute', 
    backgroundColor: 'rgba(95, 147, 251, 0.85)', 
    paddingHorizontal: 16,
    paddingVertical: 12, 
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#fff', fontSize: 11, marginLeft: 6, flex: 1 },
  distance: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  mainArrowContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 24,
    minWidth: 180,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  arrowWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(95, 147, 251, 0.25)',
    shadowColor: '#5F93FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 12,
  },
  streetViewInfoBox: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  mainArrowDistance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
    letterSpacing: 0.5,
  },
  offRouteWarningInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 68, 68, 0.25)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  offRouteTextInline: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  mainArrowBearing: {
    color: '#5F93FB',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  mainArrowInstruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 8,
  },
  stepCounterBox: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stepCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  yellowTurnArrowContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  yellowTurnArrowBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  yellowArrowCircleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  yellowArrowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(95, 147, 251, 0.6)', 
    borderWidth: 3,
    borderColor: 'rgba(95, 147, 251, 0.8)',
    shadowColor: '#5F93FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 1,
  },
  yellowArrowCircleRed: {
    backgroundColor: 'rgba(255, 68, 68, 0.6)',
    borderColor: 'rgba(255, 68, 68, 0.8)',
    shadowColor: '#FF4444',
  },
  yellowArrowIconStatic: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
    zIndex: 5,
  },
  yellowArrowGlowRed: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#FF4444',
    shadowOpacity: 0.9,
  },
  yellowArrowWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  yellowArrowWarningText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  yellowArrowDistance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
    letterSpacing: 1,
  },
  turnIndicatorContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  turnIndicatorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#00FF88',
    minWidth: 200,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  turnIndicatorLabel: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  turnIndicatorArrowContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  turnIndicatorArrow: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  turnIndicatorGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  turnIndicatorDistance: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
    letterSpacing: 1,
  },
  turnIndicatorInstruction: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
    paddingHorizontal: 8,
  },
  mapToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  roadArrowContainer: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadArrow3D: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  arrowIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowInnerShadow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
    top: 10,
    zIndex: -1,
  },
  arrow3DOuterGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(95, 147, 251, 0.2)',
    shadowColor: '#5F93FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
    zIndex: 1,
  },
  arrow3DShadow: {
    position: 'absolute',
    bottom: -20,
    width: 100,
    height: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    transform: [{ scaleX: 1.3 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    zIndex: 2,
  },
  arrow3DGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(95, 147, 251, 0.4)',
    shadowColor: '#5F93FB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 18,
    zIndex: 3,
  },
  arrowRoadBase: {
    position: 'absolute',
    bottom: -20,
    width: 100,
    height: 8,
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  roadInfoBox: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  roadInfoBoxOffRoute: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderColor: '#FF4444',
    borderWidth: 3,
  },
  roadDistanceTextOffRoute: {
    color: '#FF4444',
  },
  roadInstructionTextOffRoute: {
    color: '#FF4444',
  },
  roadDistanceText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
    letterSpacing: 1,
    marginBottom: 8,
  },
  roadInstructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 2 },
    paddingHorizontal: 12,
  },
  roadOffRouteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  roadOffRouteText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  arrowContainer: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  arrow: { alignItems: 'center', justifyContent: 'center' },
  arrowLabel: { color: '#fff', fontSize: 16, marginTop: 10, },
  turnText: { color: '#fff', fontSize: 16, marginTop: 6 },
  offRouteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  offRouteText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  destinationArrowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 12,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  destinationLabelContainer: {
    position: 'absolute',
    top: -25,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  destinationLabel: {
    color: '#5F93FB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  destinationArrowLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  destinationArrowDistance: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  destinationArrowText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  nextTurnLabelContainer: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nextTurnLabel: {
    color: '#00ff88',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  streetBtn: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  locBtn: { backgroundColor: '#5F93FB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  mapContainer: { backgroundColor: '#fff' },
  mapInfoOverlay: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8 },
  mapInfoText: { color: '#000', fontSize: 12, fontWeight: '600' },
  mapInfoSubtext: { color: '#333', fontSize: 10, marginTop: 2 },
  orientation: { color: '#fff', fontSize: 12, marginTop: 4 },
  turnHint: { color: '#fff', fontSize: 12, marginTop: 4 },
  compassBox: { position: 'absolute', alignItems: 'center', zIndex: 10 },
  compassDialContainer: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  compassOuterRing: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.4)', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  compassDial: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(8, 7, 7, 0.92)', borderWidth: 1, borderColor: '#cfd8dc', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  compassNeedleBack: { position: 'absolute', top: 6, width: 2, height: 24, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
  compassNeedle: { position: 'absolute', top: 6, width: 2, height: 24, backgroundColor: '#ff5252', borderRadius: 1 },
  compassN: { position: 'absolute', top: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  compassE: { position: 'absolute', right: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  compassS: { position: 'absolute', bottom: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  compassW: { position: 'absolute', left: 4, color: '#fff', fontSize: 10, fontWeight: '700' },
  compassHub: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#eceff1', borderWidth: 1, borderColor: '#90a4ae' },
  compassGlass: { position: 'absolute', width: 64, height: 32, top: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  compassDeg: { marginTop: 6, color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  tick: { position: 'absolute', backgroundColor: '#fff', opacity: 0.9 },
  tickTop: { top: 2, width: 10, height: 2, borderRadius: 1 },
  tickRight: { right: 2, width: 2, height: 10, borderRadius: 1 },
  tickBottom: { bottom: 2, width: 10, height: 2, borderRadius: 1 },
  tickLeft: { left: 2, width: 2, height: 10, borderRadius: 1 },
  stepItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)' },
  stepActive: { backgroundColor: 'rgba(62, 67, 70, 0.12)' },
  stepTitle: { color: '#111', fontSize: 13, fontWeight: '600' },
  stepMeta: { color: '#444', fontSize: 11, marginTop: 2 },
  stepIndex: { color: '#000', fontSize: 12, marginLeft: 8, fontWeight: '700' },
  stepsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  stepsToggleBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(95, 147, 251, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  stepsToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  
  arDestinationMarker: { position: 'absolute', alignItems: 'center' },
  arMarkerContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  arMarkerPulse: { 
    position: 'absolute', 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: 'rgba(255, 68, 68, 0.3)', 
    borderWidth: 2, 
    borderColor: 'rgba(255, 68, 68, 0.6)' 
  },
  arMarkerText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700', 
    marginTop: 4, 
    textShadowColor: 'rgba(0,0,0,0.8)', 
    textShadowRadius: 2, 
    textShadowOffset: { width: 0, height: 1 } 
  },
  
  arPathPoint: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  arPathDot: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    backgroundColor: '#5F93FB', 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  arPathGlow: { 
    position: 'absolute', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: 'rgba(95, 147, 251, 0.3)' 
  },
  
  arDistanceMarker: { position: 'absolute', alignItems: 'center' },
  arDistanceContainer: { alignItems: 'center' },
  arDistanceText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  arDistanceLine: { 
    width: 2, 
    height: 20, 
    backgroundColor: '#5F93FB', 
    marginTop: 2 
  },
  
  arTurnIndicator: { position: 'absolute', alignItems: 'center', maxWidth: 100, alignSelf: 'center' },
  arTurnContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  arTurnPulse: { 
    position: 'absolute', 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: 'rgba(0, 255, 136, 0.3)', 
    borderWidth: 2, 
    borderColor: 'rgba(0, 255, 136, 0.6)' 
  },
  arTurnText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600', 
    textAlign: 'center', 
    marginTop: 4, 
    textShadowColor: 'rgba(0,0,0,0.8)', 
    textShadowRadius: 2, 
    textShadowOffset: { width: 0, height: 1 } 
  },
  arTurnDistance: { 
    color: '#00ff88', 
    fontSize: 9, 
    fontWeight: '700', 
    marginTop: 2 
  },
  
  arToggleBtn: { 
    position: 'absolute', 
    right: 16, 
    backgroundColor: 'rgba(0, 255, 136, 0.4)', 
    padding: 8, 
    borderRadius: 20 
  },
});


// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, ActivityIndicator, Linking, Animated, Dimensions, ScrollView } from 'react-native';
// import { useIsFocused } from '@react-navigation/native';
// import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
// import Geolocation from '@react-native-community/geolocation';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import MapView, { Polyline, Marker } from 'react-native-maps';
// import MapViewDirections from 'react-native-maps-directions';
// import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { heightPercentageToDP } from '../utils';


// export default function ARNavigationScreen({ navigation, route }) {
//   const isFocused = useIsFocused();
//   const devices = useCameraDevices();
//   const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();

//   const [cameraDevice, setCameraDevice] = useState(null);
//   const [loadingDevice, setLoadingDevice] = useState(false);
//   const [hasLocationPermission, setHasLocationPermission] = useState(false);
//   const [position, setPosition] = useState(null);
//   const lastPositionRef = useRef(null);
//   const arrowRotation = useRef(new Animated.Value(0)).current;
//   const compassRotation = useRef(new Animated.Value(0)).current;
//   const [deviceHeading, setDeviceHeading] = useState(0);
//   const [userOrientation, setUserOrientation] = useState('North');
//   const [target] = useState(route?.params?.target);
//   const [staticStart] = useState(route?.params?.start || null);
//   const [routeData, setRouteData] = useState(null);
//   const [currentStep, setCurrentStep] = useState(null);
//   const [currentStepIndex, setCurrentStepIndex] = useState(null);
//   const [totalSteps, setTotalSteps] = useState(0);
//   const [distanceToNextTurn, setDistanceToNextTurn] = useState(null);
//   const [arrowIcon, setArrowIcon] = useState('navigate');
//   const [routeCoordinates, setRouteCoordinates] = useState([]);
//   const [showMap, setShowMap] = useState(true);
//   const [guidanceMessage, setGuidanceMessage] = useState('');
//   const [arrowColor] = useState('#5F93FB');
//   const [realTimeMessage, setRealTimeMessage] = useState('');

//   // ---------------- Location Permissions ----------------
//   async function requestLocationPermission() {
//     try {
//       if (Platform.OS === 'android') {
//         const res = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//         );
//         setHasLocationPermission(res === PermissionsAndroid.RESULTS.GRANTED);
//       } else {
//         const status = await Geolocation.requestAuthorization('whenInUse');
//         setHasLocationPermission(status === 'granted');
//       }
//     } catch (e) {
//       setHasLocationPermission(false);
//     }
//   }

//   // ---------------- Camera Permission ----------------
//   useEffect(() => {
//     if (isFocused && !hasCameraPermission) requestCameraPermission();
//   }, [isFocused, hasCameraPermission]);

//   // ---------------- Initial Location ----------------
//   useEffect(() => {
//     requestLocationPermission();
//     Geolocation.getCurrentPosition(
//       pos => {
//         setPosition(pos.coords);
//         lastPositionRef.current = pos.coords;
//         if (pos.coords.heading != null) setDeviceHeading(pos.coords.heading);
//       },
//       err => console.log('Initial GPS Error', err),
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
//     );
//   }, []);

//   // ---------------- GPS Tracking ----------------
//   useEffect(() => {
//     if (!hasLocationPermission) return;
//     const watchId = Geolocation.watchPosition(
//       pos => {
//         setPosition(pos.coords);
//         lastPositionRef.current = pos.coords;
//         if (pos.coords.heading != null) setDeviceHeading(pos.coords.heading);
//       },
//       err => console.log('GPS watch error', err),
//       { enableHighAccuracy: true, distanceFilter: 0.5, interval: 1000, fastestInterval: 500 }
//     );
//     return () => Geolocation.clearWatch(watchId);
//   }, [hasLocationPermission]);

//   // ---------------- Magnetometer Fallback ----------------
//   useEffect(() => {
//     setUpdateIntervalForType(SensorTypes.magnetometer, 100);
//     const subscription = magnetometer.subscribe(({ x, y }) => {
//       const heading = Math.atan2(y, x) * (180 / Math.PI);
//       const normalized = heading < 0 ? heading + 360 : heading;
//       setDeviceHeading(normalized);
//       setUserOrientation(getDeviceOrientation(normalized));
//     });
//     return () => subscription.unsubscribe();
//   }, []);

//   // ---------------- Camera Device ----------------
//   useEffect(() => {
//     async function loadDevice() {
//       if (!hasCameraPermission || !isFocused) return;
//       setLoadingDevice(true);
//       const device = devices?.back ?? (await Camera.getAvailableCameraDevices()).find(d => d.position === 'back');
//       setCameraDevice(device || null);
//       setLoadingDevice(false);
//     }
//     loadDevice();
//   }, [hasCameraPermission, isFocused, devices]);

//   // ---------------- Fetch Route ----------------
//   useEffect(() => {
//     if (position && target) {
//       fetchRouteDirections(position, target);
//     }
//   }, [position, target]);

//   // ---------------- Periodic Route Refresh ----------------
//   useEffect(() => {
//     if (!position || !target) return;
    
//     const intervalId = setInterval(() => {
//       // Refresh route every 30 seconds or when location changes significantly
//       fetchRouteDirections(position, target);
//     }, 30000); // 30 seconds
    
//     return () => clearInterval(intervalId);
//   }, [position, target]);

//   // ---------------- Arrow Rotation Animation & Real-time Messages ----------------
//   useEffect(() => {
//     if (bearingToTarget !== null && deviceHeading !== null) {
//       // Calculate relative bearing (compensate for device orientation)
//       let relativeBearing = bearingToTarget - deviceHeading;
      
//       // Normalize to -180 to 180 range
//       while (relativeBearing > 180) relativeBearing -= 360;
//       while (relativeBearing < -180) relativeBearing += 360;
      
//       // Update real-time message based on current orientation
//       const absBearing = Math.abs(relativeBearing);
//       let realTimeMsg = '';
      
//       if (absBearing <= 15) {
//         realTimeMsg = 'Move forward';
//       } else if (absBearing >= 165) {
//         realTimeMsg = 'Move backward';
//       } else if (relativeBearing > 0) {
//         realTimeMsg = 'Turn right';
//       } else {
//         realTimeMsg = 'Turn left';
//       }
      
//       setRealTimeMessage(realTimeMsg);
      
//       // Animate arrow rotation
//       Animated.timing(arrowRotation, {
//         toValue: relativeBearing,
//         duration: 300,
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [bearingToTarget, deviceHeading]);

//   async function fetchRouteDirections(origin, destination) {
//     try {
//       const API_KEY = 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE';
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${API_KEY}`;
//       const res = await fetch(url);
//       const data = await res.json();
//       if (data.status === 'OK' && data.routes.length > 0) {
//         console.log("data.routes[0]",data.routes[0]);
        
//         const route = data.routes[0];
//         const steps = route.legs[0].steps;
//         setRouteData({ route, steps });
//         setTotalSteps(steps.length);
//         setRouteCoordinates(decodePolyline(route.overview_polyline.points));
//       }
//     } catch (e) {
//       console.log('Route fetch error', e);
//     }
//   }

//   function decodePolyline(encoded) {
//     let poly = [], index = 0, lat = 0, lng = 0;
//     while (index < encoded.length) {
//       let b, shift = 0, result = 0;
//       do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
//       const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
//       shift = 0; result = 0;
//       do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
//       const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
//       poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
//     }
//     return poly;
//   }

//   function getDeviceOrientation(heading) {
//     if (heading < 22.5 || heading >= 337.5) return 'North';
//     if (heading < 67.5) return 'Northeast';
//     if (heading < 112.5) return 'East';
//     if (heading < 157.5) return 'Southeast';
//     if (heading < 202.5) return 'South';
//     if (heading < 247.5) return 'Southwest';
//     if (heading < 292.5) return 'West';
//     return 'Northwest';
//   }

//   function getCurrentNavigationStep(currentPos, steps) {
//     if (!steps || !currentPos) return null;

//     let closestStep = null;
//     let minDistance = Infinity;
//     let currentStepIndex = 0;

//     // Find the closest step to current position
//     steps.forEach((step, index) => {
//       const stepStart = step.start_location;
//       const stepEnd = step.end_location;

//       // Calculate distance to step start and end
//       const distanceToStart = haversineDistanceMeters(
//         currentPos.latitude, currentPos.longitude,
//         stepStart.lat, stepStart.lng
//       );

//       const distanceToEnd = haversineDistanceMeters(
//         currentPos.latitude, currentPos.longitude,
//         stepEnd.lat, stepEnd.lng
//       );

//       // Use the minimum distance to either start or end of step
//       const minStepDistance = Math.min(distanceToStart, distanceToEnd);

//       if (minStepDistance < minDistance) {
//         minDistance = minStepDistance;
//         closestStep = { ...step, index, distance: minStepDistance };
//         currentStepIndex = index;
//       }
//     });

//     return closestStep;
//   }

//   // ---------------- Current Step & Arrow ----------------
//   const { bearingToTarget, distance, turnInstruction } = useMemo(() => {
//     const current = position || staticStart;
//     if (!current) return { bearingToTarget: null, distance: null, turnInstruction: 'Waiting for location...' };
    
//     // Use route-based navigation if available
//     if (routeData && routeData.steps && routeData.steps.length > 0) {
//       const currentStep = getCurrentNavigationStep(current, routeData.steps);
//       if (currentStep) {
//         setCurrentStep(currentStep);
//         setCurrentStepIndex(currentStep.index);
        
//         const instruction = currentStep.html_instructions
//           .replace(/<[^>]*>/g, '')
//           .replace(/&nbsp;/g, ' ')
//           .trim();
        
//         const stepDistance = currentStep.distance?.text || '0 m';
//         setDistanceToNextTurn(stepDistance);
        
//         // Calculate bearing to next step
//         const nextStepBearing = computeBearing(
//           current.latitude, current.longitude,
//           currentStep.end_location.lat, currentStep.end_location.lng
//         );
        
//         // Get proper turn message based on device orientation
//         const turnMessage = getTurnMessage(instruction, nextStepBearing, deviceHeading);
//         setArrowIcon(getArrowIcon(instruction, nextStepBearing, deviceHeading));
        
//         // Use route distance
//         const routeDistance = routeData.route.legs[0].distance.value;
        
//         return {
//           bearingToTarget: nextStepBearing,
//           distance: routeDistance,
//           turnInstruction: `${turnMessage} in ${stepDistance}`
//         };
//       }
//     }
    
//     // Fallback to direct navigation
//     let bTarget = computeBearing(current.latitude, current.longitude, target.latitude, target.longitude);
//     let d = haversineDistanceMeters(current.latitude, current.longitude, target.latitude, target.longitude);
    
//     // Get proper turn message for direct navigation
//     const turnMessage = getTurnMessage('Head towards destination', bTarget, deviceHeading);
//     setArrowIcon(getArrowIcon('Head towards destination', bTarget, deviceHeading));
    
//     return { bearingToTarget: bTarget, distance: d, turnInstruction: turnMessage };
//   }, [position, deviceHeading, target, routeData]);

//   function computeBearing(lat1, lon1, lat2, lon2) {
//     const φ1 = lat1 * Math.PI / 180;
//     const φ2 = lat2 * Math.PI / 180;
//     const Δλ = (lon2 - lon1) * Math.PI / 180;
//     const y = Math.sin(Δλ) * Math.cos(φ2);
//     const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
//     return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
//   }

//   function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
//     const R = 6371000;
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   }

//   function getTurnMessage(instruction, targetBearing, deviceHeading) {
//     if (!targetBearing || deviceHeading === null) return 'Calculating direction...';
    
//     // Calculate relative bearing (target bearing - device heading)
//     let relativeBearing = targetBearing - deviceHeading;
    
//     // Normalize to -180 to 180 range
//     while (relativeBearing > 180) relativeBearing -= 360;
//     while (relativeBearing < -180) relativeBearing += 360;
    
//     // Check for specific instructions first
//     const lowerInstruction = instruction.toLowerCase();
//     if (lowerInstruction.includes('left') || lowerInstruction.includes('turn left')) {
//       return 'Turn left';
//     } else if (lowerInstruction.includes('right') || lowerInstruction.includes('turn right')) {
//       return 'Turn right';
//     } else if (lowerInstruction.includes('u-turn') || lowerInstruction.includes('uturn')) {
//       return 'Make U-turn';
//     } else if (lowerInstruction.includes('straight') || lowerInstruction.includes('continue')) {
//       return 'Move forward';
//     }
    
//     // Use relative bearing for general direction
//     const absBearing = Math.abs(relativeBearing);
    
//     if (absBearing <= 15) {
//       return 'Move forward';
//     } else if (absBearing >= 165) {
//       return 'Move backward';
//     } else if (relativeBearing > 0) {
//       return 'Turn right';
//     } else {
//       return 'Turn left';
//     }
//   }

//   function getArrowIcon(instruction, targetBearing, deviceHeading) {
//     if (!targetBearing || deviceHeading === null) return 'navigate';
    
//     // Calculate relative bearing (target bearing - device heading)
//     let relativeBearing = targetBearing - deviceHeading;
    
//     // Normalize to -180 to 180 range
//     while (relativeBearing > 180) relativeBearing -= 360;
//     while (relativeBearing < -180) relativeBearing += 360;
    
//     // Check for specific instructions first
//     const lowerInstruction = instruction.toLowerCase();
//     if (lowerInstruction.includes('left') || lowerInstruction.includes('turn left')) {
//       return 'arrow-back';
//     } else if (lowerInstruction.includes('right') || lowerInstruction.includes('turn right')) {
//       return 'arrow-forward';
//     } else if (lowerInstruction.includes('u-turn') || lowerInstruction.includes('uturn')) {
//       return 'arrow-down';
//     } else if (lowerInstruction.includes('straight') || lowerInstruction.includes('continue')) {
//       return 'arrow-up';
//     }
    
//     // Use relative bearing for general direction
//     const absBearing = Math.abs(relativeBearing);
    
//     if (absBearing <= 15) {
//       return 'arrow-up';
//     } else if (absBearing >= 165) {
//       return 'arrow-down';
//     } else if (relativeBearing > 0) {
//       return 'arrow-forward';
//     } else {
//       return 'arrow-back';
//     }
//   }

//   const distanceLabel = distance != null ? `${distance < 1000 ? distance.toFixed(0) + ' m' : (distance/1000).toFixed(2) + ' km'}` : '--';
//   const showCamera = cameraDevice && hasCameraPermission && isFocused;
//   const screenHeight = Dimensions.get('window').height;
//   const cameraHeight = showMap ? screenHeight * 0.55 : screenHeight;
//   const mapHeight = screenHeight * 0.45;

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={[styles.cameraContainer, { height: cameraHeight }]}>
//         {showCamera ? <Camera style={StyleSheet.absoluteFill} device={cameraDevice} isActive={true} /> :
//           <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
//             {loadingDevice ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff'}}>AR mode</Text>}
//           </View>}
//         {/* Overlays: Arrow, Compass, Info */}
//         <View style={styles.overlay} pointerEvents="box-none">
//           <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
//             <Ionicons name="chevron-back" size={26} color="#fff"/>
//           </TouchableOpacity>
          
//           {/* Step Info Display */}
//           <View style={styles.stepInfoContainer}>
//             <Text style={styles.stepInfoText}>
//               Step {currentStepIndex !== null ? currentStepIndex + 1 : '--'} of {totalSteps || '--'}
//             </Text>
          
//           </View>

//           <View style={styles.arrowContainer}>
//             <Animated.View style={{ 
//               transform: [{ 
//                 rotate: arrowRotation.interpolate({ 
//                   inputRange: [-180, 180], 
//                   outputRange: ['-180deg', '180deg'] 
//                 }) 
//               }] 
//             }}>
//               <Ionicons name={arrowIcon} size={60} color={arrowColor} />
//             </Animated.View>
//             <Text style={styles.arrowLabel}>
//               {bearingToTarget != null ? `${bearingToTarget.toFixed(0)}°` : '--'}
//             </Text>
//             <Text style={styles.turnText}>
//               {realTimeMessage || turnInstruction || 'Calculating direction...'}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {showMap && (
//         <View style={[styles.mapContainer, {height: mapHeight}]}>
//           <MapView 
//             style={StyleSheet.absoluteFill} 
//             initialRegion={{
//               latitude: position?.latitude || target?.latitude || 0,
//               longitude: position?.longitude || target?.longitude || 0,
//               latitudeDelta: 0.01, 
//               longitudeDelta: 0.01
//             }}
//             region={{
//               latitude: position?.latitude || target?.latitude || 0,
//               longitude: position?.longitude || target?.longitude || 0,
//               latitudeDelta: 0.01, 
//               longitudeDelta: 0.01
//             }}
//             showsUserLocation={true} 
//             showsCompass={false}
//             followsUserLocation={true}
//             showsMyLocationButton={false}
//           >
//             {routeCoordinates.length > 0 && (
//               <MapViewDirections
//                 origin={routeCoordinates[0]}
//                 destination={routeCoordinates[routeCoordinates.length - 1]}
//                 waypoints={routeCoordinates.slice(1, -1)}
//                 apikey="AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE"
//                 strokeColor="#5F93FB"
//                 strokeWidth={4}
//                 lineDashPattern={[1]}
//                 onReady={(result) => {
//                   console.log('Route ready:', result);
//                 }}
//                 onError={(errorMessage) => {
//                   console.log('Route error:', errorMessage);
//                 }}
//               />
//             )}
//             {target && <Marker coordinate={target} title="Destination" pinColor="red"/>}
//             {position && <Marker coordinate={position} title="Current Location" pinColor="blue"/>}
//           </MapView>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   cameraContainer: {
//     width: '100%',
//     backgroundColor: '#000',
//     height:heightPercentageToDP(50)
//   },
//   cameraPlaceholder: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#222',
//   },
//   overlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingTop: 50,
//   },
//   backBtn: {
//     position: 'absolute',
//     top: 20,
//     left: 15,
//     zIndex: 10,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     padding: 8,
//     borderRadius: 20,
//   },
//   arrowContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: heightPercentageToDP(20),
//   },
//   arrowLabel: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginTop: 35,
//   },
//   turnText: {
//     color: '#fff',
//     fontSize: 16,
//     marginTop: 4,
//     textAlign: 'center',
//   },
//   mapContainer: {
//     width: '100%',
//     backgroundColor: '#e8e8e8',
//   },
//   compassContainer: {
//     position: 'absolute',
//     bottom: 100,
//     right: 20,
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     borderWidth: 2,
//     borderColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//   },
//   compassNeedle: {
//     width: 2,
//     height: 25,
//     backgroundColor: 'red',
//   },
//   stepListContainer: {
//     position: 'absolute',
//     bottom: 0,
//     width: '100%',
//     maxHeight: 150,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     paddingVertical: 8,
//   },
//   stepItem: {
//     paddingHorizontal: 15,
//     paddingVertical: 6,
//   },
//   stepText: {
//     color: '#fff',
//     fontSize: 14,
//   },
//   stepActive: {
//     backgroundColor: 'rgba(95,147,251,0.3)',
//     borderRadius: 6,
//   },
//   stepInfoContainer: {
//     position: 'absolute',
//     top: 80,
//     left: 20,
//     right: 20,
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   stepInfoText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   stepInstructionText: {
//     color: '#fff',
//     fontSize: 14,
//     textAlign: 'center',
//     opacity: 0.9,
//   },
// });
