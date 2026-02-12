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

const HowItWorksScreen = ({ navigation }) => {
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
          <Text style={styles.headerTitle}>How It Works</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={[styles.content, { backgroundColor: 'transparent' }]}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          bounces={true}
        >
          {/* App Overview */}
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <Ionicons name="information-circle" size={32} color={blackColor} />
              <Text style={styles.sectionTitle}>How the App Works</Text>
            </View>
            <Text style={styles.description}>
              This guide explains how to use each feature of the app, which buttons to click, and what happens at each step.
            </Text>
          </View>

          {/* Home Screen Flow */}
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <Ionicons name="home" size={32} color={blackColor} />
              <Text style={styles.sectionTitle}>Home Screen</Text>
            </View>

            <StepCard
              number="1"
              title="4 Stats Cards (Top Section)"
              steps={[
                'Location: Top of Home Screen, below header',
                'Card 1: Active Chips - Shows count of chips currently active/tracking',
                'Card 2: In-Active Chips - Shows count of chips not currently active',
                'Card 3: Low Battery Chips - Shows count of chips with low battery',
                'Card 4: Chip Assignment - Shows total number of vehicles',
                'Action: Click on "Active Chips" card → Navigates to ActiveChipScreen',
                'Action: Click on "In-Active Chips" card → Navigates to ActiveChipScreen with inactive filter',
                'Action: Click on "Low Battery Chips" card → Navigates to ActiveChipScreen with low battery filter',
                'Action: Click on "Chip Assignment" card → Navigates to ChipAssignmentScreen'
              ]}
            />

            <StepCard
              number="2"
              title="Parking Yards List (Below Cards)"
              steps={[
                'Location: Below the 4 stats cards, scrollable list',
                'Shows: All parking yards/facilities in the system',
                'Each yard card displays: Yard Name, Address, Total Parking Slots',
                'Action: Scroll down to see more yards if list is long',
                'Action: Click on any yard card → Navigates to YardDetailScreen',
                'In YardDetailScreen: You can see all vehicles in that yard, add vehicles, edit yard details'
              ]}
            />

            <StepCard
              number="3"
              title="Drawer Menu (Top Left Corner)"
              steps={[
                'Location: Top left corner of header, hamburger menu icon (☰)',
                'Action: Click menu icon → Drawer slides in from left side',
                'Drawer shows options:',
                '  • Profile - Opens ProfileScreen to view/edit user profile',
                '  • Activity History - Opens ActivityHistoryScreen to see all activities',
                '  • How It Works - Opens HowItWorksScreen (this screen)',
                'Action: Click any option → Navigates to that respective screen',
                'Action: Click outside drawer or back button → Closes drawer'
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
              title="How to Reach Yard Detail Screen"
              steps={[
                'From Home Screen: Click on any parking yard card → Opens YardDetailScreen',
                'From Map Tab: Click on yard → Opens YardDetailScreen',
                'From Facility Tab: Click on yard → Opens YardDetailScreen',
                'Screen shows: Yard name, address, total slots, and list of all vehicles in that yard'
              ]}
            />

            <StepCard
              number="2"
              title="Add Vehicle Button (Floating Button - Bottom Right)"
              steps={[
                'Location: Floating "+" button at bottom right corner',
                'Action: Click "+" button → Camera opens for VIN scanning',
                'Step 1: Scan vehicle VIN barcode using camera',
                'Step 2: System automatically checks if VIN already exists in database',
                'If VIN duplicate found → Error modal shows with message "VIN already exists in [Yard Name]"',
                'If VIN is new → Vehicle details modal opens automatically',
                'Modal shows: VIN (auto-filled), Make (auto-filled), Model (auto-filled), Color field, Slot Number field'
              ]}
            />

            <StepCard
              number="3"
              title="Enter Vehicle Details in Modal"
              steps={[
                'Location: Modal that opens after scanning VIN',
                'VIN: Already filled from scan (cannot edit)',
                'Make: Already filled from VIN database (cannot edit)',
                'Model: Already filled from VIN database (cannot edit)',
                'Color: Enter vehicle color (required field, minimum 2 characters)',
                'Slot Number: Enter parking slot number (required field)',
                'Real-time validation: As you type slot number, system checks availability',
                'If slot already occupied → Red error shows "Slot occupied by VIN: [VIN Number]"',
                'If slot is available → Green checkmark (✓) appears next to slot field',
                'Action: Click "Save" button → Vehicle saved to database'
              ]}
            />

            <StepCard
              number="4"
              title="Assign Chip (Optional - After Saving Vehicle)"
              steps={[
                'Location: After saving vehicle, "Assign Chip" button appears',
                'Action: Click "Assign Chip" button → Camera opens for chip scanning',
                'Step 1: Scan chip barcode using camera',
                'Step 2: System checks if chip is already assigned to another vehicle',
                'If chip already assigned → Duplicate chip modal opens',
                'Duplicate modal shows: Chip is assigned to vehicle [VIN] in [Yard Name]',
                'Options in duplicate modal: "Cancel" or "Unassign & Assign"',
                'If "Unassign & Assign" → Chip unassigned from old vehicle, assigned to new vehicle',
                'If chip is available → Chip assigned directly to vehicle',
                'After assignment: Vehicle status changes to "Active" and can be tracked on map'
              ]}
            />

            <StepCard
              number="5"
              title="Skip Chip Button (Optional)"
              steps={[
                'Location: After saving vehicle, "Skip Chip" button appears',
                'Action: Click "Skip Chip" button → Vehicle saved without chip assignment',
                'Result: Vehicle appears in yard vehicle list',
                'Status: Shows as "Unassigned" (no chip attached)',
                'Later: You can assign chip from Vehicle Details Screen anytime'
              ]}
            />

            <StepCard
              number="6"
              title="Edit Yard Button (Top Right Header)"
              steps={[
                'Location: Top right corner of header, edit icon (✏️)',
                'Action: Click edit icon → Edit Yard modal opens',
                'Modal shows: Yard Name (editable), Address (editable), Total Slots (editable)',
                'Action: Change any field → Type new values',
                'Action: Click "Save" button → Updates yard info in database',
                'Result: Yard info refreshes automatically on screen',
                'Action: Click "Cancel" → Closes modal without saving changes'
              ]}
            />

            <StepCard
              number="7"
              title="View Vehicles in Yard"
              steps={[
                'Location: Main list area showing all vehicles',
                'Each vehicle card shows: VIN, Make/Model, Color, Slot Number, Chip Status',
                'Action: Click on any vehicle card → Navigates to VehicleDetailsScreen',
                'In VehicleDetailsScreen: See full details, assign/unassign chip, view on map'
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
              title="How to Reach Vehicle Details Screen"
              steps={[
                'From YardDetailScreen: Click on any vehicle card → Opens VehicleDetailsScreen',
                'From Search Screen: Click on search result → Opens VehicleDetailsScreen',
                'From Scan Screen: After scanning, click "View Details" → Opens VehicleDetailsScreen',
                'From Map Screen: Click on vehicle marker → Opens VehicleDetailsScreen',
                'Screen shows: Complete vehicle information, map view (if chip assigned), action buttons'
              ]}
            />

            <StepCard
              number="2"
              title="View Vehicle Information"
              steps={[
                'Location: Top section of screen',
                'Shows: VIN Number, Make, Model, Color, Slot Number, Chip ID (if assigned)',
                'Shows: Parking Yard name where vehicle is parked',
                'Shows: Chip Status (Active/Inactive) if chip is assigned',
                'Shows: Last updated timestamp'
              ]}
            />

            <StepCard
              number="3"
              title="View Vehicle on Map (If Chip Assigned)"
              steps={[
                'Location: Map section in middle of screen',
                'Condition: Only shows if vehicle has chip assigned',
                'Blue marker = Your current location (GPS)',
                'Red marker = Vehicle location (from chip GPS)',
                'Distance: Shows distance between you and vehicle at bottom',
                'Action: Zoom in/out, pan around map to see locations',
                'If no chip: Map section shows "No chip assigned" message'
              ]}
            />

            <StepCard
              number="4"
              title="Assign Chip Button (If Vehicle Has No Chip)"
              steps={[
                'Location: Bottom section, "Assign Chip" button (only shows if no chip)',
                'Action: Click "Assign Chip" button → Camera opens',
                'Step 1: Scan chip barcode using camera',
                'Step 2: System checks if chip already assigned to another vehicle',
                'If chip duplicate → Modal shows "Chip already assigned to [VIN] in [Yard]"',
                'Duplicate modal options: "Cancel" or "Unassign & Assign"',
                'If "Unassign & Assign" → Chip unassigned from old vehicle, assigned to current vehicle',
                'If chip available → Chip assigned directly',
                'Result: Vehicle status changes to "Active", map starts showing location',
                'Result: Chip ID appears in vehicle details'
              ]}
            />

            <StepCard
              number="5"
              title="Unassign Chip Button (If Vehicle Has Chip)"
              steps={[
                'Location: Bottom section, "Unassign Chip" button (only shows if chip assigned)',
                'Action: Click "Unassign Chip" button → Confirmation alert appears',
                'Alert message: "Are you sure you want to unassign this chip?"',
                'Alert options: "Cancel" or "Unassign"',
                'Action: Click "Unassign" → Chip removed from vehicle',
                'Result: Vehicle status changes to "Inactive"',
                'Result: Chip moved to inactive chips list',
                'Result: Map stops showing vehicle location',
                'Result: Chip ID removed from vehicle details'
              ]}
            />

            <StepCard
              number="6"
              title="Back Navigation"
              steps={[
                'Location: Top left corner, back arrow button',
                'Action: Click back arrow → Returns to previous screen',
                'Returns to: YardDetailScreen, SearchScreen, ScanScreen, or MapScreen (depending on where you came from)'
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
              title="How to Reach Scan Screen"
              steps={[
                'Location: Bottom navigation bar, "Scan" tab (📷 icon)',
                'Action: Click Scan tab → Opens ScanScreen',
                'Screen shows: Title "Search Vehicles", search bar at top, 3 scan option cards below'
              ]}
            />

            <StepCard
              number="2"
              title="Search Bar (Top Section)"
              steps={[
                'Location: Top of Scan Screen, below title',
                'Appearance: Light black background, black border, search icon on left',
                'Action: Click on search bar → Navigates to SearchScreen',
                'In SearchScreen: Type VIN, Make, Model, Year, or Chip ID',
                'Results: Show instantly as you type (real-time search)',
                'Action: Click any search result → Opens VehicleDetailsScreen',
                'Back: Click back arrow → Returns to ScanScreen'
              ]}
            />

            <StepCard
              number="3"
              title="Search by VIN Scan (Card Option 1)"
              steps={[
                'Location: First card below search bar, "Search by VIN Scan"',
                'Card shows: Car icon, title, description, arrow icon',
                'Action: Click card → Camera opens for barcode scanning',
                'Step 1: Point camera at vehicle VIN barcode',
                'Step 2: Wait for barcode to be detected (auto-scan)',
                'Step 3: System searches database for scanned VIN',
                'If vehicle found → Vehicle details modal opens',
                'Modal shows: VIN, Make, Model, Yard, Slot, Chip Status',
                'Modal buttons: "Close" or "View Details"',
                'Action: Click "View Details" → Opens VehicleDetailsScreen',
                'If VIN not found → "VIN Not Found" modal opens',
                'Not found modal: Shows "Would you like to add it to a yard?"',
                'Options: "No" (closes modal) or "Yes" (opens yard selection)',
                'If "Yes" → Yard selection modal opens → Select yard → Opens YardDetailScreen'
              ]}
            />

            <StepCard
              number="4"
              title="Search VIN (Photo) - OCR Method (Card Option 2)"
              steps={[
                'Location: Second card, "Search VIN (Photo)"',
                'Card shows: Document icon, title, description, arrow icon',
                'Action: Click card → Alert appears with options',
                'Alert options: "Cancel", "Camera", or "Gallery"',
                'Option 1 - Camera: Click "Camera" → Camera opens',
                '  Step 1: Take photo of VIN area',
                '  Step 2: Crop screen appears - drag corners to focus on VIN',
                '  Step 3: Click "Done" → Image processed',
                'Option 2 - Gallery: Click "Gallery" → Gallery opens',
                '  Step 1: Select photo from gallery',
                '  Step 2: Crop screen appears - drag corners to focus on VIN',
                '  Step 3: Click "Done" → Image processed',
                'Processing: App uses OCR (Optical Character Recognition) to read VIN from image',
                'Step 4: VIN extracted from image text',
                'Step 5: System searches database for extracted VIN',
                'If vehicle found → Success animation (✓) shows for 1.4 seconds',
                'After animation → Vehicle details modal opens automatically',
                'Modal shows: VIN, Make, Model, Yard, Slot, Chip Status',
                'Modal buttons: "Close" or "View Details"',
                'Action: Click "View Details" → Opens VehicleDetailsScreen',
                'If VIN not found → "VIN Not Found" modal opens',
                'Not found modal: Shows "Would you like to add it to a yard?"',
                'Options: "No" (closes) or "Yes" (opens yard selection → Select yard → Opens YardDetailScreen)',
                'Note: You can copy/save the image after taking/selecting it'
              ]}
            />

            <StepCard
              number="5"
              title="Search by Chip Scan (Card Option 3)"
              steps={[
                'Location: Third card, "Search by Chip Scan"',
                'Card shows: Chip icon (green), title, description, arrow icon',
                'Action: Click card → Camera opens for chip barcode scanning',
                'Step 1: Point camera at tracker chip barcode',
                'Step 2: Wait for barcode to be detected (auto-scan)',
                'Step 3: System searches database for chip ID',
                'Step 4: System checks if chip is assigned to any vehicle',
                'If chip assigned → Vehicle details modal opens',
                'Modal shows: Vehicle VIN, Make, Model, Yard, Slot, Chip Status',
                'Modal buttons: "Close" or "View Details"',
                'Action: Click "View Details" → Opens VehicleDetailsScreen',
                'If chip not assigned → "Chip Not Assigned" modal opens',
                'Modal message: "This tracker chip is not assigned to any vehicle"',
                'Option: "Close" button → Closes modal',
                'Note: Chip must be assigned to a vehicle first before it can be searched'
              ]}
            />
          </View>

          {/* Add Vehicle Screen */}
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <Ionicons name="add-circle" size={32} color="#9C27B0" />
              <Text style={styles.sectionTitle}>Add Vehicle Screen (Tab)</Text>
            </View>

            <StepCard
              number="1"
              title="How to Reach Add Vehicle Screen"
              steps={[
                'Location: Bottom navigation bar, "Add" tab (+ icon)',
                'Action: Click Add tab → Opens AddVehicleScreen',
                'Screen shows: Title, parking yard dropdown selector, 2 card options (Read VIN, Scan VIN)'
              ]}
            />

            <StepCard
              number="2"
              title="Select Parking Yard (First Step)"
              steps={[
                'Location: Top section, dropdown selector',
                'Action: Click dropdown → List of all parking yards appears',
                'List shows: All yards/facilities in the system',
                'Action: Select a yard from dropdown → Yard name appears in selector',
                'Important: Must select yard before scanning VIN',
                'This determines which yard the vehicle will be added to'
              ]}
            />

            <StepCard
              number="3"
              title="Read VIN Option (Card 1 - OCR Method)"
              steps={[
                'Location: First card, "Read VIN" with document icon',
                'Card shows: Document icon, title, description, arrow',
                'Action: Click "Read VIN" card → TextScanScreen opens',
                'Step 1: Alert appears with options: "Cancel", "Camera", or "Gallery"',
                'Option - Camera: Click "Camera" → Camera opens',
                '  Step 2a: Take photo of VIN area',
                '  Step 2b: Crop screen appears - adjust corners to focus on VIN',
                '  Step 2c: Click "Done" → Image processed',
                'Option - Gallery: Click "Gallery" → Gallery opens',
                '  Step 2a: Select photo from gallery',
                '  Step 2b: Crop screen appears - adjust corners to focus on VIN',
                '  Step 2c: Click "Done" → Image processed',
                'Step 3: OCR reads VIN from image',
                'Step 4: System checks if VIN already exists',
                'If VIN exists → Modal shows "Vehicle exists in [Yard Name]"',
                'If VIN is new → Returns to AddVehicleScreen with VIN data',
                'Step 5: Yard selection modal opens automatically',
                'Step 6: Select yard (or use pre-selected yard)',
                'Step 7: Navigates to YardDetailScreen with VIN pre-filled',
                'Step 8: Enter Color and Slot Number in modal',
                'Step 9: Click "Save" → Vehicle added to selected yard'
              ]}
            />

            <StepCard
              number="4"
              title="Scan VIN Option (Card 2 - Barcode Method)"
              steps={[
                'Location: Second card, "Scan VIN" with camera icon',
                'Card shows: Camera icon, title, description, arrow',
                'Action: Click "Scan VIN" card → ScannerScreen opens',
                'Step 1: Camera opens for barcode scanning',
                'Step 2: Point camera at vehicle VIN barcode',
                'Step 3: Wait for barcode to be detected (auto-scan)',
                'Step 4: System checks if VIN already exists in database',
                'If VIN exists → Modal shows "Vehicle exists in [Yard Name]"',
                'Modal options: "OK" (closes modal)',
                'If VIN is new → Returns to AddVehicleScreen',
                'Step 5: Yard selection modal opens automatically',
                'Step 6: Select yard from list (or use pre-selected yard)',
                'Step 7: Navigates to YardDetailScreen with VIN pre-filled',
                'Step 8: Vehicle details modal opens automatically',
                'Modal shows: VIN (auto-filled), Make (auto-filled), Model (auto-filled)',
                'Step 9: Enter Color (required, min 2 chars)',
                'Step 10: Enter Slot Number (required)',
                'Step 11: System checks slot availability in real-time',
                'If slot occupied → Error shows "Slot occupied by VIN: [VIN]"',
                'If slot available → Green checkmark (✓) appears',
                'Step 12: Click "Save" → Vehicle added to selected yard',
                'Step 13: Option to assign chip or skip chip appears'
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
              title="Home Tab (🏠 Icon)"
              steps={[
                'Location: Bottom navigation bar, first tab (leftmost)',
                'Icon: Home icon (Feather icon)',
                'Action: Click Home tab → Opens HomeScreen',
                'HomeScreen shows:',
                '  • 4 stats cards at top (Active Chips, Inactive Chips, Low Battery Chips, Chip Assignment)',
                '  • List of all parking yards below cards',
                '  • Drawer menu icon in header (top left)',
                '  • Search icon in header (top right)',
                'Navigation: Click any yard card → Opens YardDetailScreen',
                'Navigation: Click stats card → Opens respective chip screen',
                'Navigation: Click drawer menu → Opens drawer with Profile, Activity History, How It Works'
              ]}
            />

            <StepCard
              number="2"
              title="Map Tab (🗺️ Icon)"
              steps={[
                'Location: Bottom navigation bar, second tab',
                'Icon: Map outline icon (Ionicons)',
                'Action: Click Map tab → Opens MapStack → Shows YardListScreen',
                'YardListScreen shows:',
                '  • Search bar at top (search yards)',
                '  • List of all parking yards',
                'Navigation: Click any yard → Opens YardPolygonsMapScreen',
                'YardPolygonsMapScreen shows:',
                '  • Map view with yard polygon boundaries',
                '  • Vehicle markers on map',
                'Navigation: Click vehicle marker → Opens VehicleDetailsScreen',
                'Navigation: Click yard polygon → Opens YardDetailScreen'
              ]}
            />

            <StepCard
              number="3"
              title="Scan Tab (📷 Icon)"
              steps={[
                'Location: Bottom navigation bar, third tab (middle)',
                'Icon: QR code icon (Ionicons)',
                'Action: Click Scan tab → Opens ScanScreen',
                'ScanScreen shows:',
                '  • Title "Search Vehicles"',
                '  • Search bar at top (opens SearchScreen)',
                '  • 3 scan option cards:',
                '    1. Search by VIN Scan (barcode scanner)',
                '    2. Search VIN (Photo) - OCR method',
                '    3. Search by Chip Scan (chip barcode)',
                'Navigation: Click search bar → Opens SearchScreen',
                'Navigation: Click any scan card → Opens respective scanner',
                'Navigation: After scan → Shows vehicle details modal or not found modal'
              ]}
            />

            <StepCard
              number="4"
              title="Add Vehicle Tab (+ Icon)"
              steps={[
                'Location: Bottom navigation bar, fourth tab',
                'Icon: Add circle icon (Ionicons), label shows "Add"',
                'Action: Click Add tab → Opens AddVehicleScreen',
                'AddVehicleScreen shows:',
                '  • Parking yard dropdown selector (select yard first)',
                '  • 2 card options:',
                '    1. Read VIN (OCR method - camera/gallery)',
                '    2. Scan VIN (barcode scanner method)',
                'Flow: Select yard → Click scan option → Scan VIN → Add vehicle details → Save',
                'Navigation: After scanning → Opens YardDetailScreen with VIN pre-filled'
              ]}
            />

            <StepCard
              number="5"
              title="Facility Tab (🏢 Icon)"
              steps={[
                'Location: Bottom navigation bar, fifth tab (rightmost)',
                'Icon: Business icon (Ionicons)',
                'Action: Click Facility tab → Opens ParkingYardStack → Shows ParkingYardScreen',
                'ParkingYardScreen shows:',
                '  • Search bar at top (search yards)',
                '  • List of all parking yards/facilities',
                '  • Add yard button (floating + button)',
                'Navigation: Click yard card → Opens YardDetailScreen',
                'Navigation: Click + button → Opens "Add Yard" modal',
                'Add Yard modal: Enter yard name, address, total slots → Save',
                'Edit Yard: Click edit icon on yard card → Edit yard details → Save',
                'Delete Yard: Long press yard card → Delete option appears'
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
              title="How to Reach Profile Screen"
              steps={[
                'From Home Screen: Click drawer menu icon (☰) in top left',
                'Drawer slides in from left side',
                'Action: Click "Profile" option in drawer → Opens ProfileScreen',
                'Screen shows: User profile information, activity statistics cards'
              ]}
            />

            <StepCard
              number="2"
              title="View Profile Information"
              steps={[
                'Location: Top section of ProfileScreen',
                'Shows: User Name, Email Address, Member Since Date',
                'Shows: Profile avatar/icon',
                'All information is read-only (cannot edit directly)'
              ]}
            />

            <StepCard
              number="3"
              title="Activity Stats Cards (4 Cards)"
              steps={[
                'Location: Below profile info, 4 statistics cards',
                'Card 1: Total Vehicles - Shows total count of all vehicles in system',
                'Card 2: Parking Yards - Shows total count of parking yards/facilities',
                'Card 3: Active/Inactive Chips - Shows count breakdown',
                'Card 4: Low Battery Chips - Shows count of chips with low battery',
                'Cards update automatically based on current data in database'
              ]}
            />

            <StepCard
              number="4"
              title="Edit Profile Button"
              steps={[
                'Location: Below stats cards, "Edit Profile" button',
                'Action: Click "Edit Profile" button → Edit Profile modal opens',
                'Modal shows form with editable fields:',
                '  • Name (text input)',
                '  • Email (text input)',
                '  • Contact (text input)',
                'Action: Type new values in fields',
                'Action: Click "Save Changes" button → Updates profile in database',
                'Result: ProfileScreen refreshes automatically with new data',
                'Action: Click "Cancel" → Closes modal without saving changes'
              ]}
            />

            <StepCard
              number="5"
              title="Logout Button (Top Right Header)"
              steps={[
                'Location: Top right corner of header, logout icon',
                'Action: Click logout icon → Confirmation modal appears',
                'Modal message: "Are you sure you want to logout?"',
                'Modal options: "Cancel" or "Logout"',
                'Action: Click "Logout" → All user data cleared from device',
                'Result: Returns to LoginScreen',
                'User must login again to access app',
                'Action: Click "Cancel" → Closes modal, stays on ProfileScreen'
              ]}
            />

            <StepCard
              number="6"
              title="Back Navigation"
              steps={[
                'Location: Top left corner, back arrow button',
                'Action: Click back arrow → Returns to HomeScreen',
                'Drawer closes automatically when navigating back'
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
    </LinearGradient>
  );
};

// Helper Components
const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={20} color={blackColor} />
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
    // backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    // backgroundColor: '#FFFFFF',
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
    // backgroundColor: '#FFFFFF',
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
    borderLeftColor: blackColor,
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
    backgroundColor: blackColor,
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
    backgroundColor: blackColor,
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
    // backgroundColor: '#FFFFFF',
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
    color: 'black',
    marginBottom: spacings.large,
    textAlign: 'center',
  }
});

export default HowItWorksScreen;

