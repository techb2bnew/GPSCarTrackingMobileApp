import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import { spacings, style } from '../constants/Fonts';

const { width, height } = Dimensions.get('window');

const ActiveChipsMap = ({ 
  activeChips, 
  currentLocation, 
  onChipPress,
  onViewDetail,
  style 
}) => {
  const [selectedChip, setSelectedChip] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const mapRef = useRef(null);

  // Auto zoom to current location when it's available
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      // Small delay to ensure map is fully loaded
      setTimeout(() => {
        mapRef.current.animateToRegion({
          ...currentLocation,
          latitudeDelta: 0.01, // Zoom level for current location
          longitudeDelta: 0.01,
        }, 1000); // 1 second animation
      }, 500);
    }
  }, [currentLocation]);

  const handleChipPress = (chip) => {
    setSelectedChip(chip);
    setShowTooltip(true);
    if (onChipPress) {
      onChipPress(chip);
    }
  };

  const closeTooltip = () => {
    setShowTooltip(false);
    setSelectedChip(null);
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now - updateTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return updateTime.toLocaleDateString();
  };

  const renderCurrentLocationMarker = () => {
    if (!currentLocation) return null;
    
    return (
      <Marker
        coordinate={currentLocation}
        title="Current Location"
        description="Your current position"
      >
        <View style={styles.currentLocationMarker}>
          <Ionicons name="location" size={24} color="#007AFF" />
        </View>
      </Marker>
    );
  };

  const renderChipMarkers = () => {
    return activeChips.map((chip) => {
      if (!chip.latitude || !chip.longitude) return null;
      
      return (
        <Marker
          key={chip.id}
          coordinate={{
            latitude: parseFloat(chip.latitude),
            longitude: parseFloat(chip.longitude)
          }}
          onPress={() => handleChipPress(chip)}
        >
          <View style={styles.chipMarker}>
            <View style={styles.chipMarkerInner}>
              <Ionicons name="car" size={16} color="#FF3B30" />
            </View>
          </View>
        </Marker>
      );
    });
  };

  const renderTooltip = () => {
    if (!selectedChip || !showTooltip) return null;

    return (
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
              
              <View style={styles.tooltipContent}>
                <View style={styles.tooltipRow}>
                  <Ionicons name="car" size={20} color="#007AFF" />
                  <Text style={styles.tooltipLabel}>VIN:</Text>
                  <Text style={styles.tooltipValue}>{selectedChip.vin || 'N/A'}</Text>
                </View>
                
                <View style={styles.tooltipRow}>
                  <Ionicons name="hardware-chip" size={20} color="#34C759" />
                  <Text style={styles.tooltipLabel}>Chip ID:</Text>
                  <Text style={styles.tooltipValue}>{selectedChip.chip_id || 'N/A'}</Text>
                </View>
                
                <View style={styles.tooltipRow}>
                  <Ionicons name="business" size={20} color="#FF9500" />
                  <Text style={styles.tooltipLabel}>Yard:</Text>
                  <Text style={styles.tooltipValue}>{selectedChip.yard_name || 'N/A'}</Text>
                </View>
                
                <View style={styles.tooltipRow}>
                  <Ionicons name="time" size={20} color="#FF3B30" />
                  <Text style={styles.tooltipLabel}>Last Update:</Text>
                  <Text style={styles.tooltipValue}>{formatLastUpdate(selectedChip.last_location_update)}</Text>
                </View>
              </View>
              
              {/* View Detail Button */}
              <View style={styles.tooltipButtonContainer}>
                <TouchableOpacity 
                  style={styles.viewDetailButton}
                  onPress={() => {
                    closeTooltip();
                    if (onViewDetail) {
                      onViewDetail(selectedChip);
                    }
                  }}
                >
                  <Ionicons name="eye" size={20} color="#FFF" />
                  <Text style={styles.viewDetailButtonText}>View Detail</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Default region for map (Delhi coordinates)
  const defaultRegion = {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Calculate region based on current location and active chips
  const getMapRegion = () => {
    if (currentLocation) {
      return {
        ...currentLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    
    // If we have active chips, center on first chip
    if (activeChips.length > 0 && activeChips[0].latitude) {
      return {
        latitude: parseFloat(activeChips[0].latitude),
        longitude: parseFloat(activeChips[0].longitude),
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    
    return defaultRegion;
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={getMapRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        loadingEnabled={true}
      >
        {renderCurrentLocationMarker()}
        {renderChipMarkers()}
      </MapView>
      
      {renderTooltip()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: spacings.small,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chipMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: spacings.small,
    borderWidth: 3,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  chipMarkerInner: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: spacings.xsmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIcon: {
    fontSize: style.fontSizeNormal.fontSize,
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
  tooltipButtonContainer: {
    padding: spacings.large,
    paddingTop: 0,
  },
  viewDetailButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 8,
  },
  viewDetailButtonText: {
    color: '#FFF',
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ActiveChipsMap;
