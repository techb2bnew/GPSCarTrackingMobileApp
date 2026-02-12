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
import { LEGAL_EMAIL, LEGAL_PHONE, LEGAL_PHONE_TEL } from '../constants/ContactInfo';
import { heightPercentageToDP as hp } from '../utils';

const TermsOfServiceScreen = ({ navigation }) => {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
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
            
            <Text style={styles.heading}>1. Agreement to Terms</Text>
            <Text style={styles.paragraph}>
              By downloading, installing, or using this mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            </Text>

            <Text style={styles.heading}>2. License to Use</Text>
            <Text style={styles.paragraph}>
              We grant you a limited, non-exclusive, non-transferable license to use the application for managing vehicles and parking facilities. This license is subject to the following restrictions:
            </Text>
            <Text style={styles.bulletPoint}>• You may not copy, modify, or create derivative works of the application</Text>
            <Text style={styles.bulletPoint}>• You may not reverse engineer, decompile, or disassemble the software</Text>
            <Text style={styles.bulletPoint}>• You may not remove or alter any copyright, trademark, or proprietary notices</Text>
            <Text style={styles.bulletPoint}>• You may not use the application for any illegal or unauthorized purpose</Text>

            <Text style={styles.heading}>3. Account Registration</Text>
            <Text style={styles.paragraph}>
              To use certain features of the application, you must create an account. You agree to:
            </Text>
            <Text style={styles.bulletPoint}>• Provide accurate, current, and complete information during registration</Text>
            <Text style={styles.bulletPoint}>• Maintain and update your account information to keep it accurate</Text>
            <Text style={styles.bulletPoint}>• Maintain the security of your account password</Text>
            <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>

            <Text style={styles.heading}>4. Prohibited Activities</Text>
            <Text style={styles.paragraph}>
              You agree not to engage in any of the following prohibited activities:
            </Text>
            <Text style={styles.bulletPoint}>• Using the application for any illegal purpose or in violation of any laws</Text>
            <Text style={styles.bulletPoint}>• Transmitting any harmful code, viruses, or malicious software</Text>
            <Text style={styles.bulletPoint}>• Attempting to gain unauthorized access to the application or its systems</Text>
            <Text style={styles.bulletPoint}>• Interfering with or disrupting the application's functionality</Text>
            <Text style={styles.bulletPoint}>• Collecting or harvesting user information without consent</Text>
            <Text style={styles.bulletPoint}>• Impersonating any person or entity or misrepresenting your affiliation</Text>

            <Text style={styles.heading}>5. Vehicle and Parking Management</Text>
            <Text style={styles.paragraph}>
              When using the application to manage vehicles and parking facilities, you agree to:
            </Text>
            <Text style={styles.bulletPoint}>• Provide accurate vehicle information (VIN, make, model, etc.)</Text>
            <Text style={styles.bulletPoint}>• Ensure all GPS tracking devices are used in compliance with local laws</Text>
            <Text style={styles.bulletPoint}>• Maintain proper security and control over tracking chips</Text>
            <Text style={styles.bulletPoint}>• Use location tracking features responsibly and ethically</Text>

            <Text style={styles.heading}>6. Intellectual Property</Text>
            <Text style={styles.paragraph}>
              The application and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </Text>

            <Text style={styles.heading}>7. Service Modifications</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify, suspend, or discontinue the application or any part thereof at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance.
            </Text>

            <Text style={styles.heading}>8. Disclaimer of Warranties</Text>
            <Text style={styles.paragraph}>
              The application is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the application will be uninterrupted, secure, or error-free.
            </Text>

            <Text style={styles.heading}>9. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </Text>

            <Text style={styles.heading}>10. Indemnification</Text>
            <Text style={styles.paragraph}>
              You agree to indemnify, defend, and hold harmless our company, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising out of or in any way connected with your use of the application or violation of these Terms.
            </Text>

            <Text style={styles.heading}>11. Account Termination</Text>
            <Text style={styles.paragraph}>
              We may terminate or suspend your account immediately, without prior notice, if you breach these Terms of Service. Upon termination, your right to use the application will cease immediately.
            </Text>

            <Text style={styles.heading}>12. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of the application after any changes constitutes your acceptance of the new Terms.
            </Text>

            <Text style={styles.heading}>13. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which our company operates, without regard to its conflict of law provisions.
            </Text>

            <Text style={styles.heading}>14. Dispute Resolution</Text>
            <Text style={styles.paragraph}>
              Any disputes arising out of or relating to these Terms or the application shall be resolved through binding arbitration in accordance with the rules of the applicable arbitration association.
            </Text>

            <Text style={styles.heading}>15. Contact Information</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms of Service, please contact us at:
            </Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Email: </Text>
              <TouchableOpacity onPress={() => {
                Linking.openURL(`mailto:${LEGAL_EMAIL}`).catch(() => {
                  Alert.alert('Error', 'Unable to open email client');
                });
              }}>
                <Text style={styles.contactInfoLink}>{LEGAL_EMAIL}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Phone: </Text>
              <TouchableOpacity onPress={() => {
                Linking.openURL(`tel:${LEGAL_PHONE_TEL}`).catch(() => {
                  Alert.alert('Error', 'Unable to make phone call');
                });
              }}>
                <Text style={styles.contactInfoLink}>{LEGAL_PHONE}</Text>
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

export default TermsOfServiceScreen;
