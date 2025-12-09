import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-simple-toast';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabaseClient';
import { spacings, style } from '../constants/Fonts';
import { blackColor, grayColor, redColor, whiteColor } from '../constants/Color';

const ReportIssueScreen = ({ navigation }) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    issueTitle: '',
    issueDescription: '',
  });

  // Get user data from Redux
  const userData = useSelector(state => state.user.userData);

  // Clear specific error
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Validate form
  const validateForm = () => {
    let newErrors = {
      issueTitle: '',
      issueDescription: '',
    };
    let isValid = true;

    if (!issueTitle.trim()) {
      newErrors.issueTitle = 'Please enter issue title';
      isValid = false;
    }

    if (!issueDescription.trim()) {
      newErrors.issueDescription = 'Please describe the issue';
      isValid = false;
    } else if (issueDescription.trim().length < 10) {
      newErrors.issueDescription = 'Please provide more details (min 10 characters)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Check if user is logged in
    if (!userData || !userData.id) {
      Alert.alert(
        'Login Required',
        'Please login to report an issue.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare report data
      const reportData = {
        user_id: userData.id || userData.userId || 'unknown',
        user_name: userData.name || userData.username || userData.email || 'Anonymous',
        user_email: userData.email || null,
        issue_title: issueTitle.trim(),
        issue_category: issueCategory.trim() || 'General',
        issue_description: issueDescription.trim(),
        status: 'pending',
        priority: 'normal',
      };

      console.log('Submitting report:', reportData);

      // Insert to Supabase
      const { data, error } = await supabase
        .from('report_issues')
        .insert([reportData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Report submitted successfully:', data);

      // Show success message
      Toast.show('✅ Issue reported successfully! We will review it soon.', Toast.LONG);

      // Navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 500);

    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert(
        'Submission Failed',
        'Failed to submit your report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[  styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : spacings.xLarge }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#003F65" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Need Help?</Text>
              <Text style={styles.infoText}>
                Please describe the issue you're facing. Our team will review and get back to you soon.
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Issue Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="alert-circle-outline" size={16} color="#003F65" /> Issue Title *
              </Text>
              <View style={[styles.inputWrapper, errors.issueTitle && styles.inputError]}>
                <Ionicons name="create-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={issueTitle}
                  onChangeText={(text) => {
                    setIssueTitle(text);
                    clearError('issueTitle');
                  }}
                  placeholder="Brief summary of the issue"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
              {errors.issueTitle ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={redColor} />
                  <Text style={styles.errorText}>{errors.issueTitle}</Text>
                </View>
              ) : null}
            </View>

            {/* Issue Category (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="list-outline" size={16} color="#003F65" /> Category (Optional)
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="folder-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={issueCategory}
                  onChangeText={setIssueCategory}
                  placeholder="e.g., Technical, App Issue, Feature Request"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Issue Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="document-text-outline" size={16} color="#003F65" /> Issue Description *
              </Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.issueDescription && styles.inputError]}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={issueDescription}
                  onChangeText={(text) => {
                    setIssueDescription(text);
                    clearError('issueDescription');
                  }}
                  placeholder="Please provide detailed information about the issue..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
              {errors.issueDescription ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={redColor} />
                  <Text style={styles.errorText}>{errors.issueDescription}</Text>
                </View>
              ) : null}
              <Text style={styles.helperText}>
                Minimum 10 characters required
              </Text>
            </View>

            {/* User Info Display */}
            {userData && (
              <View style={styles.userInfoCard}>
                <Ionicons name="person-circle-outline" size={20} color="#666" />
                <Text style={styles.userInfoText}>
                  Reporting as: {userData.name || userData.username || userData.email || 'User'}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Extra space for keyboard */}
          <View style={{ height: Platform.OS === 'ios' ? 40 : 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: whiteColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacings.xxxLarge,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: spacings.small,
  },
  headerTitle: {
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightThin1x.fontWeight,
    color: blackColor,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacings.xxxLarge,
    paddingTop: spacings.large,
  },
  infoCard: {
    backgroundColor: '#F3F0FF',
    borderRadius: 16,
    padding: spacings.large,
    marginBottom: spacings.xLarge,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E0D4FF',
  },
  infoIconContainer: {
    marginRight: spacings.medium,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: style.fontSizeNormal.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    color: '#003F65',
    marginBottom: spacings.xsmall,
  },
  infoText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#003F65',
    lineHeight: 20,
  },
  formSection: {
    marginBottom: spacings.xLarge,
  },
  inputGroup: {
    marginBottom: spacings.xLarge,
  },
  inputLabel: {
    fontSize: style.fontSizeMedium.fontSize,
    fontWeight: style.fontWeightMedium.fontWeight,
    color: '#333',
    marginBottom: spacings.small,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 15,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacings.large,
    fontSize: style.fontSizeNormal.fontSize,
    color: blackColor,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 10,
  },
  inputError: {
    borderColor: redColor,
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    color: redColor,
    fontSize: style.fontSizeSmall2x.fontSize,
    marginLeft: 6,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  helperText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: grayColor,
    marginTop: 6,
    fontStyle: 'italic',
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: spacings.small2x,
    borderRadius: 10,
    marginBottom: spacings.medium,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userInfoText: {
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#666',
    marginLeft: 8,
    fontWeight: style.fontWeightThin1x.fontWeight,
  },
  submitButton: {
    backgroundColor: '#003F65',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacings.xLarge,
    borderRadius: 12,
    marginTop: spacings.large,
    shadowColor: '#003F65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9E8FE5',
    opacity: 0.7,
  },
  submitButtonText: {
    color: whiteColor,
    fontSize: style.fontSizeNormal2x.fontSize,
    fontWeight: style.fontWeightBold.fontWeight,
    marginLeft: 10,
  },
});

export default ReportIssueScreen;

