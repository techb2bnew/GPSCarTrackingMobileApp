import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TextRecognition from 'react-native-text-recognition';
import ImagePicker from 'react-native-image-crop-picker';
import LinearGradient from 'react-native-linear-gradient';
import {
  nissanPrimaryBlue,
  whiteColor,
  grayColor,
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
} from '../constants/Color';
import { spacings } from '../constants/Fonts';

const CROP_OPTIONS = {
  cropping: true,
  width: 1200,
  height: 1200,
  freeStyleCropEnabled: true,
  cropperToolbarTitle: 'Crop the area you want to read',
};

const VIN_REGEX = /[A-HJ-NPR-Z0-9]{17}/g;

const extractVinFromText = (text) => {
  if (!text) return null;
  const upper = text.toUpperCase();
  const directMatch = upper.match(VIN_REGEX);
  if (directMatch && directMatch.length > 0) return directMatch[0];

  const cleaned = upper.replace(/[^A-Z0-9]/g, '');
  const cleanedMatch = cleaned.match(VIN_REGEX);
  if (cleanedMatch && cleanedMatch.length > 0) return cleanedMatch[0];

  return null;
};

const TextScanScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const mode = route?.params?.mode;
  const autoOpen = route?.params?.autoOpen;
  const returnTo = route?.params?.returnTo || 'YardDetailScreen';
  const hideResult = route?.params?.hideResult;
  const suppressConsole = route?.params?.suppressConsole;

  const getImagePath = (pathOrUri) => {
    if (!pathOrUri) return null;
    if (Platform.OS === 'ios' && pathOrUri.startsWith('file://')) {
      return pathOrUri.replace('file://', '');
    }
    return pathOrUri;
  };

  const processImage = async (pathOrUri) => {
    const path = getImagePath(pathOrUri);
    if (!path) {
      Alert.alert('Error', 'Could not get image path.');
      return;
    }
    setLoading(true);
    setRecognizedText('');
    try {
      const result = await TextRecognition.recognize(path);
      const text = Array.isArray(result) ? result.join('\n') : String(result || '');
      if (!hideResult) {
        setRecognizedText(text || 'No text found.');
      }
      if (!suppressConsole) {
        console.log('📜 [TextScan] Recognized text:', text);
      }

      if (mode === 'vin') {
        const vin = extractVinFromText(text);
        if (!vin) {
          Alert.alert('VIN not found', 'VIN could not be detected. Please crop again and retry.');
          return;
        }
        // If used for Search flow: after reading VIN, return to screen and trigger search
        if (route?.params?.asSearchFlow) {
          navigation.navigate({
            name: returnTo,
            params: {
              textScanResult: {
                type: 'vin',
                value: vin,
              },
            },
            merge: true,
          });
          return;
        }
        // If used from Add Vehicle flow: after reading VIN, open yard selection flow (same as scan add flow)
        if (route?.params?.asAddVehicleFlow) {
          navigation.navigate({
            name: returnTo,
            params: {
              notFoundData: {
                type: 'vin',
                scannedValue: vin,
                isAddingVehicle: true,
              },
            },
            merge: true,
          });
          return;
        }

        navigation.navigate({
          name: returnTo,
          params: {
            vinNumber: vin,
            yardId: route?.params?.yardId,
            yardName: route?.params?.yardName,
          },
          merge: true,
        });
      }
    } catch (err) {
      console.error('Text recognition error:', err);
      setRecognizedText('');
      Alert.alert('Error', err?.message || 'Text recognition failed.');
    } finally {
      setLoading(false);
    }
  };

  const openCameraWithCrop = async () => {
    try {
      const image = await ImagePicker.openCamera(CROP_OPTIONS);
      if (image?.path) processImage(image.path);
    } catch (err) {
      if (err?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', err?.message || 'Camera / crop failed.');
      }
    }
  };

  const openGalleryWithCrop = async () => {
    try {
      const image = await ImagePicker.openPicker({
        ...CROP_OPTIONS,
        mediaType: 'photo',
      });
      if (image?.path) processImage(image.path);
    } catch (err) {
      if (err?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', err?.message || 'Gallery / crop failed.');
      }
    }
  };

  const showImageSourceAlert = () => {
    Alert.alert(
      'Image Source',
      'Capture from camera or pick from gallery, then crop the exact area you want to read.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: openCameraWithCrop },
        { text: 'Gallery', onPress: openGalleryWithCrop },
      ]
    );
  };

  useEffect(() => {
    if (autoOpen) {
      showImageSourceAlert();
    }
  }, [autoOpen]);

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
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : spacings.xLarge }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Text</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={showImageSourceAlert}
          disabled={loading}
        >
          <Ionicons name="document-text-outline" size={28} color={whiteColor} />
          <Text style={styles.scanButtonText}>
            {loading ? 'Processing...' : 'Capture from camera / gallery'}
          </Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={nissanPrimaryBlue} />
            <Text style={styles.loadingText}>Reading text...</Text>
          </View>
        )}

        {!loading && recognizedText && !hideResult ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Recognized text (also logged in console):</Text>
            <Text style={styles.resultText}>{recognizedText}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: whiteColor,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nissanPrimaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  scanButtonText: {
    color: whiteColor,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingWrap: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: grayColor,
  },
  resultBox: {
    marginTop: 24,
    backgroundColor: whiteColor,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultLabel: {
    fontSize: 12,
    color: grayColor,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});

export default TextScanScreen;
