import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { spacings, style } from '../constants/Fonts';
import {
  gradientSoftTop,
  gradientSoftMid1,
  gradientSoftMid2,
  gradientSoftMid3,
  gradientSoftMid4,
  gradientSoftBottom,
  blackColor,
} from '../constants/Color';
import { PRIVACY_EMAIL, PRIVACY_PHONE, PRIVACY_PHONE_TEL } from '../constants/ContactInfo';
import { heightPercentageToDP as hp } from '../utils';

const PrivacyPolicyScreen = ({ navigation }) => {
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
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={[styles.content, { backgroundColor: 'transparent' }]}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? hp(15) : hp(12) }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          bounces={true}
        >
          {/* Content */}
          <View style={styles.section}>
            <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>
            
            <Text style={styles.heading}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              This Privacy Policy describes how we collect, use, and protect your personal information when you use our mobile application.
            </Text>

            <Text style={styles.heading}>2. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect information that you provide directly to us, including:
            </Text>
            <Text style={styles.bulletPoint}>• Personal identification information (name, email, contact number)</Text>
            <Text style={styles.bulletPoint}>• Vehicle information (VIN, make, model, color)</Text>
            <Text style={styles.bulletPoint}>• Parking yard and facility information</Text>
            <Text style={styles.bulletPoint}>• Chip and tracking device information</Text>
            <Text style={styles.bulletPoint}>• Location data when using GPS tracking features</Text>

            <Text style={styles.heading}>3. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use the collected information for:
            </Text>
            <Text style={styles.bulletPoint}>• Providing and maintaining our services</Text>
            <Text style={styles.bulletPoint}>• Managing vehicle and parking yard operations</Text>
            <Text style={styles.bulletPoint}>• Tracking and monitoring vehicles with GPS chips</Text>
            <Text style={styles.bulletPoint}>• Sending notifications and updates</Text>
            <Text style={styles.bulletPoint}>• Improving our application and user experience</Text>

            <Text style={styles.heading}>4. Data Storage and Security</Text>
            <Text style={styles.paragraph}>
              We implement appropriate security measures to protect your personal information. Your data is stored securely and accessed only by authorized personnel.
            </Text>

            <Text style={styles.heading}>5. Data Sharing</Text>
            <Text style={styles.paragraph}>
              We do not sell, trade, or rent your personal information to third parties. We may share information only when required by law or with your explicit consent.
            </Text>

            <Text style={styles.heading}>6. Your Rights</Text>
            <Text style={styles.paragraph}>
              You have the right to:
            </Text>
            <Text style={styles.bulletPoint}>• Access your personal information</Text>
            <Text style={styles.bulletPoint}>• Update or correct your information</Text>
            <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
            <Text style={styles.bulletPoint}>• Opt-out of certain data collection</Text>

            <Text style={styles.heading}>7. Cookies and Tracking</Text>
            <Text style={styles.paragraph}>
              Our application may use cookies and similar tracking technologies to enhance your experience and analyze usage patterns.
            </Text>

            <Text style={styles.heading}>8. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </Text>

            <Text style={styles.heading}>9. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Email: </Text>
              <TouchableOpacity onPress={() => {
                Linking.openURL(`mailto:${PRIVACY_EMAIL}`).catch(() => {
                  Alert.alert('Error', 'Unable to open email client');
                });
              }}>
                <Text style={styles.contactInfoLink}>{PRIVACY_EMAIL}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Phone: </Text>
              <TouchableOpacity onPress={() => {
                Linking.openURL(`tel:${PRIVACY_PHONE_TEL}`).catch(() => {
                  Alert.alert('Error', 'Unable to make phone call');
                });
              }}>
                <Text style={styles.contactInfoLink}>{PRIVACY_PHONE}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacings.large,
  },
  lastUpdated: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: spacings.large,
  },
  heading: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#1A1A1A',
    marginTop: spacings.large,
    marginBottom: spacings.medium,
  },
  paragraph: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#333',
    lineHeight: 24,
    marginBottom: spacings.medium,
  },
  bulletPoint: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#333',
    lineHeight: 24,
    marginBottom: spacings.small,
    marginLeft: spacings.medium,
  },
  contactInfo: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#333',
    lineHeight: 24,
    marginBottom: spacings.small,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.small,
    flexWrap: 'wrap',
  },
  contactLabel: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#333',
    lineHeight: 24,
    fontWeight: style.fontWeightMedium.fontWeight,
  },
  contactInfoLink: {
    fontSize: style.fontSizeMedium.fontSize,
    color: blackColor,
    lineHeight: 24,
    fontWeight: style.fontWeightMedium.fontWeight,
    textDecorationLine: 'underline',
  },
});

export default PrivacyPolicyScreen;
