// import React, { useEffect, useState } from "react";
// import { View, Text, FlatList, StyleSheet } from "react-native";
// import { BleManager } from "react-native-ble-plx";

// const BleTesting = () => {
//   const [devices, setDevices] = useState([]);
//   const manager = new BleManager();

//   useEffect(() => {
//     manager.startDeviceScan(null, null, (error, device) => {
//       if (error) {
//         console.error("Scan error:", error);
//         return;
//       }

//       if (device) {
//         // console.log wali string banayenge
//         const logString =
//           "BLE Device: " + JSON.stringify(device, null, 2);

//         setDevices(prev => {
//           // agar pehle se hai to repeat na ho
//           if (prev.find(d => d.id === device.id)) {
//             return prev;
//           }
//           return [...prev, { id: device.id, log: logString }];
//         });
//       }
//     });

//     return () => {
//       manager.stopDeviceScan();
//     };
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>Nearby BLE Devices</Text>
//       <FlatList
//         data={devices}
//         keyExtractor={item => item.id}
//         renderItem={({ item }) => (
//           <View style={styles.card}>
//             <Text style={styles.text}>{item.log}</Text>
//           </View>
//         )}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 10, backgroundColor: "#fff" },
//   header: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
//   card: {
//     padding: 10,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     marginBottom: 10,
//     backgroundColor: "#f9f9f9",
//   },
//   text: { fontSize: 12, color: "#333", fontFamily: "Courier" },
// });

// export default BleTesting;

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

const manager = new BleManager();

const BLEScannerIOS = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [deviceDetails, setDeviceDetails] = useState(null);

  // 🔹 Scan Devices (iOS)
  useEffect(() => {
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }

      if (device && device.id) {
        setDevices(prev => {
          const exists = prev.find(d => d.id === device.id);
          if (exists) return prev;
          return [...prev, device];
        });
      }
    });

    return () => {
      manager.stopDeviceScan();
    };
  }, []);

  // 🔹 Parse GPS Data if present
  const parseLatLong = rawScanRecord => {
    try {
      const decoded = Buffer.from(rawScanRecord, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      if (parsed?.gps) {
        const [latStr, lonStr] = parsed.gps.split(',');
        return {
          latitude: parseFloat(latStr),
          longitude: parseFloat(lonStr),
        };
      }
    } catch (err) {
      console.warn('No valid GPS found:', err);
    }
    return null;
  };

  // 🔹 Connect to Device
  const connectToDevice = async device => {
    try {
      console.log('Connecting to:', device.name || 'Unknown', device.id);
      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();

      setConnectedDevice(connected);

      let details = {
        id: connected.id,
        name: connected.name || device.localName || 'Unknown',
        rssi: device.rssi,
      };

      if (device.rawScanRecord) {
        const gpsData = parseLatLong(device.rawScanRecord);
        console.log('gpsData::', device.rawScanRecord);

        if (gpsData) {
          details = {...details, ...gpsData};
        }
      }

      setDeviceDetails(details);
      console.log('✅ Connected:', details);
    } catch (err) {
      console.error('❌ Connection error:', err);
    }
  };

  // 🔹 Disconnect from Device
  const disconnectFromDevice = async () => {
    if (connectedDevice) {
      try {
        await manager.cancelDeviceConnection(connectedDevice.id);
        console.log('🔴 Disconnected:', connectedDevice.id);
        setConnectedDevice(null);
        setDeviceDetails(null);
      } catch (err) {
        console.error('❌ Disconnect error:', err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nearby BLE Devices (iOS)</Text>

      {/* 🔹 List of Devices */}
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({item}) => {
          const isConnected = connectedDevice?.id === item.id;
          const deviceName = item.name || item.localName || 'Unknown Device';
          return (
            <View style={styles.card}>
              <View style={{flex: 1}}>
                <Text style={styles.name}>{deviceName}</Text>
                <Text style={styles.id}>{item.id}</Text>
                <Text style={styles.rssi}>RSSI: {item.rssi}</Text>
              </View>
              <TouchableOpacity
                style={[styles.button, isConnected && styles.connectedButton]}
                onPress={() =>
                  isConnected ? disconnectFromDevice() : connectToDevice(item)
                }>
                <Text style={styles.buttonText}>
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* 🔹 Connected Device Details */}
      {deviceDetails && (
        <ScrollView style={styles.detailsBox}>
          <Text style={styles.detailsHeader}>Connected Device Details</Text>
          <Text>ID: {deviceDetails.id}</Text>
          <Text>Name: {deviceDetails.name}</Text>
          <Text>RSSI: {deviceDetails.rssi}</Text>
          {deviceDetails.latitude && (
            <Text>
              Latitude: {deviceDetails.latitude}, Longitude:{' '}
              {deviceDetails.longitude}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', padding: 10},
  header: {fontSize: 20, fontWeight: 'bold', marginVertical: 20},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  name: {fontSize: 16, fontWeight: '600'},
  id: {fontSize: 12, color: '#555'},
  rssi: {fontSize: 12, color: '#999'},
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  connectedButton: {
    backgroundColor: 'red',
  },
  buttonText: {color: '#fff', fontWeight: 'bold'},
  detailsBox: {
    marginTop: 15,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eef',
    borderWidth: 1,
    borderColor: '#99f',
  },
  detailsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default BLEScannerIOS;
