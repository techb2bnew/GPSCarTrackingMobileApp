import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, ImageBackground } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const notifications = [
    {
        id: '1',
        title: 'Yard Breach',
        message: 'The car has exited from Yard No. 2 and needs to be tracked immediately before it leads to any issue.',
        time: '2 mins ago',
    },
    {
        id: '2',
        title: 'Security Alert',
        message: 'The car has exited from Yard No. 2 and needs to be tracked immediately before it leads to any issue.',
        time: '2 mins ago',
    },
    {
        id: '3',
        title: 'Vehicle Escaped',
        message: 'The car has exited from Yard No. 2 and needs to be tracked immediately before it leads to any issue.',
        time: '2 mins ago',
    },
];

export default function NotificationScreen({ navigation }) {
    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.time}>{item.time}</Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ImageBackground style={styles.container}  resizeMode="cover">
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notification</Text>
                </View>

                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
    },
    card: {
        paddingVertical: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    time: {
        fontSize: 12,
        color: '#808080',
    },
    message: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#e6e6e6',
        marginVertical: 10,
    },
});
