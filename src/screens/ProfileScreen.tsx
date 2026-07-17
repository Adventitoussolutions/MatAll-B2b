import { Feather, Ionicons } from '@expo/vector-icons'; // Assuming you use expo vector icons
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CompleteProfileScreen() {
    const navigation = useNavigation<any>();
    const [fullName, setFullName] = useState('');
    const [trade, setTrade] = useState('');
    const [location, setLocation] = useState('');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Complete your profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Image Placeholder */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <Feather name="user" size={40} color="#999" />
                    </View>
                    <TouchableOpacity style={styles.cameraButton}>
                        <Ionicons name="camera" size={16} color="#FFE600" />
                    </TouchableOpacity>
                </View>

                {/* Inputs */}
                <Text style={styles.label}>Full name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ramesh Kumar"
                    value={fullName}
                    onChangeText={setFullName}
                />

                <Text style={styles.label}>Trade</Text>
                <View style={styles.inputWithIconContainer}>
                    <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Electrician"
                        value={trade}
                        onChangeText={setTrade}
                    />
                    <Feather name="chevron-down" size={20} color="#999" style={{ paddingRight: 15 }} />
                </View>

                <Text style={styles.label}>Site / business location</Text>
                <View style={styles.inputWithIconContainer}>
                    <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Sector 49, Gurugram"
                        value={location}
                        onChangeText={setLocation}
                    />
                    <Ionicons name="location-outline" size={20} color="#999" style={{ paddingRight: 15 }} />
                </View>

                <TouchableOpacity>
                    <Text style={styles.currentLocationText}>Use current location</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={() => {/* Handle Continue */ }}>
                    <Text style={styles.continueText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTitle: { fontSize: 18, marginLeft: 15, color: '#333' },
    content: { padding: 20 },
    avatarSection: { alignItems: 'center', marginVertical: 30 },
    avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    cameraButton: { position: 'absolute', bottom: 0, right: '35%', backgroundColor: '#000', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    label: { fontSize: 14, color: '#999', marginBottom: 8, marginTop: 15 },
    input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 15, fontSize: 16 },
    inputWithIconContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
    inputWithIcon: { flex: 1, padding: 15, fontSize: 16 },
    currentLocationText: { fontSize: 14, color: '#333', marginTop: 10 },
    footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
    continueButton: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
    continueText: { color: '#FFE600', fontSize: 16, fontWeight: 'bold' }
});
