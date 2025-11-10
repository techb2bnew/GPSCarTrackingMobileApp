import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacings, style } from '../constants/Fonts';

const HowItWorksScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How It Works</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Overview */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="information-circle" size={32} color="#613EEA" />
            <Text style={styles.sectionTitle}>How the App Works</Text>
          </View>
          <Text style={styles.description}>
            This guide explains how to use each feature of the app, which buttons to click, and what happens at each step.
          </Text>
        </View>

        {/* Home Screen Flow */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="home" size={32} color="#613EEA" />
            <Text style={styles.sectionTitle}>Home Screen</Text>
          </View>
          
          <StepCard
            number="1"
            title="View Parking Yards"
            steps={[
              'Open app → Home Screen shows',
              'See list of all parking yards',
              'Each yard shows: Name, Address, Total Slots',
              'Click on any yard card → Opens Yard Detail Screen'
            ]}
          />
          
          <StepCard
            number="2"
            title="Search Button (Top Right)"
            steps={[
              'Click search icon (🔍) in header',
              'Opens Search Screen',
              'Type VIN, Make, Model, or Chip ID',
              'Results show instantly',
              'Click any result → Opens Vehicle Details Screen'
            ]}
          />
          
          <StepCard
            number="3"
            title="Drawer Menu (Top Left)"
            steps={[
              'Click menu icon (☰) in header',
              'Drawer slides from left',
              'Options: Profile, Activity History, How It Works',
              'Click any option → Opens that screen'
            ]}
          />
        </View>

        {/* Yard Detail Screen */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="business" size={32} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Yard Detail Screen</Text>
          </View>
          
          <StepCard
            number="1"
            title="Add Vehicle Button (Bottom Right)"
            steps={[
              'Click floating "+" button (bottom right)',
              'Camera opens for VIN scanning',
              'Scan vehicle VIN barcode',
              'System checks if VIN already exists',
              'If duplicate → Shows error with yard name',
              'If new → Vehicle details modal opens'
            ]}
          />
          
          <StepCard
            number="2"
            title="Enter Vehicle Details"
            steps={[
              'VIN details auto-filled (Make, Model)',
              'Enter Color (required, min 2 chars)',
              'Enter Slot Number (required)',
              'System checks slot availability in real-time',
              'If slot occupied → Shows error with VIN',
              'If available → Shows green checkmark ✓'
            ]}
          />
          
          <StepCard
            number="3"
            title="Assign Chip (Optional)"
            steps={[
              'Click "Assign Chip" button',
              'Camera opens for chip scanning',
              'Scan chip barcode',
              'System checks if chip already assigned',
              'If duplicate → Shows modal with unassign option',
              'If available → Chip assigned to vehicle',
              'Vehicle saved to database'
            ]}
          />
          
          <StepCard
            number="4"
            title="Skip Chip Button"
            steps={[
              'Click "Skip Chip" button',
              'Vehicle saved without chip',
              'Can assign chip later',
              'Vehicle appears in yard list',
              'Shows as "Unassigned" status'
            ]}
          />
          
          <StepCard
            number="5"
            title="Edit Yard Button (Top Right)"
            steps={[
              'Click edit icon (✏️) in header',
              'Edit Yard modal opens',
              'Change: Yard Name, Address, Total Slots',
              'Click "Save" → Updates in database',
              'Yard info refreshes automatically'
            ]}
          />
        </View>

        {/* Vehicle Details Screen */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="car" size={32} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Vehicle Details Screen</Text>
          </View>
          
          <StepCard
            number="1"
            title="View Vehicle on Map"
            steps={[
              'Click on any vehicle from list',
              'Vehicle Details Screen opens',
              'If chip assigned → Map shows vehicle location',
              'Blue marker = Your location',
              'Red marker = Vehicle location',
              'Distance shown at bottom'
            ]}
          />
          
          <StepCard
            number="2"
            title="Assign Chip Button"
            steps={[
              'If vehicle has no chip → "Assign Chip" button shows',
              'Click "Assign Chip" button',
              'Camera opens for scanning',
              'Scan chip barcode',
              'System checks for duplicates',
              'Chip assigned → Vehicle becomes active',
              'Can now track on map'
            ]}
          />
          
          <StepCard
            number="3"
            title="Unassign Chip Button"
            steps={[
              'If vehicle has chip → "Unassign Chip" button shows',
              'Click "Unassign Chip" button',
              'Confirmation alert appears',
              'Click "Unassign" → Chip removed',
              'Vehicle becomes inactive',
              'Chip moved to inactive list'
            ]}
          />
        </View>

        {/* Scan Screen */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="scan" size={32} color="#00BCD4" />
            <Text style={styles.sectionTitle}>Scan Screen (Tab)</Text>
          </View>
          
          <StepCard
            number="1"
            title="Scan VIN Button"
            steps={[
              'Go to Scan tab (bottom navigation)',
              'Click "Scan VIN" button',
              'Camera opens',
              'Scan vehicle VIN barcode',
              'If found → Shows vehicle details modal',
              'Click "View Details" → Opens Vehicle Details Screen',
              'If not found → Shows "Add Vehicle" option'
            ]}
          />
          
          <StepCard
            number="2"
            title="Scan Chip Button"
            steps={[
              'Click "Scan Chip" button',
              'Camera opens',
              'Scan chip barcode',
              'If found → Shows vehicle with that chip',
              'Click "View Details" → Opens Vehicle Details Screen',
              'If not found → Chip is available for assignment'
            ]}
          />
        </View>

        {/* Search Screen */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="search" size={32} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Search Screen</Text>
          </View>
          
          <StepCard
            number="1"
            title="Search Vehicles"
            steps={[
              'Click search icon from Home Screen',
              'Search bar appears at top',
              'Type: VIN, Make, Model, Chip ID, or Yard name',
              'Results show instantly as you type',
              'Each result shows: VIN, Make/Model, Yard, Slot',
              'Click any result → Opens Vehicle Details Screen'
            ]}
          />
        </View>

        {/* Bottom Navigation */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="apps" size={32} color="#FF9500" />
            <Text style={styles.sectionTitle}>Bottom Navigation Tabs</Text>
          </View>
          
          <StepCard
            number="1"
            title="Home Tab (🏠)"
            steps={[
              'Shows all parking yards',
              'Quick access to search',
              'Drawer menu for profile & settings'
            ]}
          />
          
          <StepCard
            number="2"
            title="Parking Yards Tab (🏢)"
            steps={[
              'List of all yards',
              'Click yard → View yard details',
              'Manage vehicles in each yard'
            ]}
          />
          
          <StepCard
            number="3"
            title="Scan Tab (📷)"
            steps={[
              'Quick access to VIN/Chip scanning',
              'Scan VIN button',
              'Scan Chip button'
            ]}
          />
          
          <StepCard
            number="4"
            title="VIN List Tab (📋)"
            steps={[
              'Shows all vehicles across all yards',
              'Filter by yard',
              'Quick vehicle lookup'
            ]}
          />
        </View>

        {/* Profile Screen */}
        <View style={styles.section}>
          <View style={styles.iconHeader}>
            <Ionicons name="person" size={32} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Profile Screen</Text>
          </View>
          
          <StepCard
            number="1"
            title="View Profile"
            steps={[
              'Open drawer menu → Click "Profile"',
              'Shows: Name, Email, Join Date',
              'Activity Stats cards show:',
              '  • Total Vehicles',
              '  • Parking Yards',
              '  • Active/Inactive Chips',
              '  • Low Battery Chips'
            ]}
          />
          
          <StepCard
            number="2"
            title="Edit Profile Button"
            steps={[
              'Click "Edit Profile" button',
              'Modal opens with form',
              'Edit: Name, Email, Contact',
              'Click "Save Changes" → Updates in database',
              'Profile refreshes automatically'
            ]}
          />
          
          <StepCard
            number="3"
            title="Logout Button (Top Right)"
            steps={[
              'Click logout icon in header',
              'Confirmation modal appears',
              'Click "Logout" → Clears all data',
              'Returns to Login Screen'
            ]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.footerTitle}>You're All Set!</Text>
          <Text style={styles.footerText}>Start managing your vehicles and parking yards</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper Components
const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={20} color="#613EEA" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const StepCard = ({ number, title, steps }) => (
  <View style={styles.stepCard}>
    <View style={styles.stepHeader}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
    {steps.map((step, index) => (
      <View key={index} style={styles.stepItem}>
        <View style={styles.stepBullet} />
        <Text style={styles.stepText}>{step}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    marginVertical: spacings.small,
    padding: spacings.large,
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  sectionTitle: {
    fontSize: style.fontSizeLargeX.fontSize,
    fontWeight: style.fontWeightBlack.fontWeight,
    color: '#1A1A1A',
    marginLeft: spacings.small2x,
  },
  description: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#666',
    lineHeight: 24,
    marginBottom: spacings.large,
  },
  stepCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: spacings.large,
    marginBottom: spacings.large,
    borderLeftWidth: 4,
    borderLeftColor: '#613EEA',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacings.large,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#613EEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacings.small2x,
  },
  stepNumberText: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightBlack.fontWeight,
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: style.fontSizeMedium1x.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#1A1A1A',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacings.normal,
  },
  stepBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#613EEA',
    marginTop: spacings.small,
    marginRight: spacings.small2x,
  },
  stepText: {
    flex: 1,
    fontSize: style.fontSizeSmall1x.fontSize,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacings.ExtraLarge2x,
    backgroundColor: '#FFFFFF',
  },
  footerTitle: {
    fontSize: style.fontSizeLarge.fontSize,
    fontWeight: style.fontWeightMedium1x.fontWeight,
    color: '#1A1A1A',
    marginTop: spacings.small2x,
    marginBottom: spacings.small,
  },
  footerText: {
    fontSize: style.fontSizeMedium.fontSize,
    color: '#666',
    marginBottom: spacings.large,
    textAlign: 'center',
  },
  versionText: {
    fontSize: style.fontSizeSmall.fontSize,
    color: '#BBB',
    marginTop: spacings.small,
  },
});

export default HowItWorksScreen;

