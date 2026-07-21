import { Feather, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

export default function CompleteProfileScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    const [fullName, setFullName] = useState('');
    const [trade, setTrade] = useState('');
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [availableTrades, setAvailableTrades] = useState<any[]>([]);
    const [isTradeModalVisible, setIsTradeModalVisible] = useState(false);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const response = await api.get('/api/b2b/onboarding/trades');
                setAvailableTrades(response.data || []);
            } catch (err) {
                console.error('Failed to fetch trades', err);
            }
        };
        fetchTrades();
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfileImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!fullName.trim() || !trade.trim()) {
            Alert.alert('Missing Fields', 'Please enter your full name and trade.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', fullName.trim());
            formData.append('trade', trade.trim());

            if (profileImageUri) {
                const filename = profileImageUri.split('/').pop() || 'profile.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('profilePicture', {
                    uri: profileImageUri,
                    name: filename,
                    type
                } as any);
            }

            await api.post('/api/b2b/onboarding/step2', formData);

            // If onboarding is complete, usually navigate to the Home screen
            Alert.alert('Success', 'Profile completed successfully!', [
                {
                    text: 'OK',
                    onPress: () => navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                    })
                }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to complete profile.');
        } finally {
            setIsLoading(false);
        }
    };

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
                        {profileImageUri ? (
                            <Image
                                source={{ uri: profileImageUri }}
                                style={{ width: 90, height: 90, borderRadius: 45 }}
                            />
                        ) : (
                            <Feather name="user" size={40} color="#999" />
                        )}
                    </View>
                    <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
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

                <Text style={styles.label}>Your Trade (e.g., Plumber, Carpenter)</Text>
                <View style={[styles.inputWithIconContainer, { backgroundColor: '#F9FAFB', overflow: 'hidden' }]}>
                    <Picker
                        selectedValue={trade}
                        onValueChange={(itemValue) => setTrade(itemValue)}
                        style={{ flex: 1, backgroundColor: 'transparent' }}
                        dropdownIconColor="#999"
                    >
                        <Picker.Item label="Tap to select your trade" value="" color="#999" />
                        {availableTrades.map((t) => (
                            <Picker.Item key={t._id} label={t.name} value={t.name} />
                        ))}
                    </Picker>
                </View>
            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.continueButton, (!fullName || !trade) && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={isLoading || !fullName || !trade}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.continueText}>Continue</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Trade Modal removed since we use native Picker */}
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
