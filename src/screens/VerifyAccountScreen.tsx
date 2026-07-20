import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import VerificationCard from '../components/VerificationCard';
import api from '../services/api';

export default function VerifyAccountScreen() {
    const navigation: any = useNavigation();
    const [selfie, setSelfie] = useState<any>(null);
    const [workVideo, setWorkVideo] = useState<any>(null);
    const [aadhaarCard, setAadhaarCard] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handlePickSelfie = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You've refused to allow this app to access your camera!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelfie(result.assets[0]);
        }
    };

    const handlePickWorkVideo = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You've refused to allow this app to access your camera!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
            videoMaxDuration: 15,
        });

        if (!result.canceled) {
            setWorkVideo(result.assets[0]);
        }
    };

    const handlePickAadhaar = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
        });

        if (!result.canceled) {
            setAadhaarCard(result.assets[0]);
        }
    };

    const isReadyToSubmit = selfie && workVideo;

    const handleSubmit = async () => {
        if (!isReadyToSubmit) return;
        
        setIsLoading(true);
        try {
            const formData = new FormData();
            
            // Append selfie
            const selfieUri = selfie.uri;
            const selfieType = selfie.mimeType || 'image/jpeg';
            const selfieName = selfie.fileName || `selfie-${Date.now()}.jpg`;
            formData.append('selfie', {
                uri: selfieUri,
                type: selfieType,
                name: selfieName,
            } as any);

            // Append work video
            const videoUri = workVideo.uri;
            const videoType = workVideo.mimeType || 'video/mp4';
            const videoName = workVideo.fileName || `video-${Date.now()}.mp4`;
            formData.append('workVideo', {
                uri: videoUri,
                type: videoType,
                name: videoName,
            } as any);

            // Append Aadhaar if available
            if (aadhaarCard) {
                const aadhaarUri = aadhaarCard.uri;
                const aadhaarType = aadhaarCard.mimeType || 'application/pdf';
                const aadhaarName = aadhaarCard.name || `aadhaar-${Date.now()}`;
                formData.append('aadhaarCard', {
                    uri: aadhaarUri,
                    type: aadhaarType,
                    name: aadhaarName,
                } as any);
            }

            await api.post('/api/b2b/onboarding/step1', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            Alert.alert('Success', 'Documents uploaded successfully.', [
                {
                    text: 'OK',
                    onPress: () => navigation.replace('CompleteProfile')
                }
            ]);
            
        } catch (error: any) {
            Alert.alert('Upload Failed', error.response?.data?.error || error.message || 'Something went wrong during upload.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerTitle}>Verify your account</Text>
                <Text style={styles.headerSubtitle}>Required before you can accept orders</Text>

                <View style={styles.cardsContainer}>
                    <VerificationCard
                        title="Selfie"
                        subtitle={selfie ? "Selfie captured" : "Live photo, no uploads"}
                        status={selfie ? "completed" : "pending"}
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={handlePickSelfie}
                    />
                    <VerificationCard
                        title="Work video"
                        subtitle={workVideo ? "Video captured" : "15-sec clip of you at work"}
                        status={workVideo ? "completed" : "pending"}
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={handlePickWorkVideo}
                    />
                    <VerificationCard
                        title="Aadhaar"
                        subtitle={aadhaarCard ? "Document attached" : "Optional, speeds up approval"}
                        status={aadhaarCard ? "completed" : "skipped"}
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={handlePickAadhaar}
                    />
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Documents are encrypted and used only for verification. Never shared with third parties.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[
                        styles.submitButton,
                        isReadyToSubmit ? styles.submitButtonActive : null
                    ]} 
                    disabled={!isReadyToSubmit || isLoading}
                    onPress={handleSubmit}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={[
                            styles.submitButtonText,
                            isReadyToSubmit ? styles.submitButtonTextActive : null
                        ]}>
                            Submit for review
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 30,
    },
    cardsContainer: {
        marginBottom: 30,
    },
    placeholderIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
    },
    infoBox: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 18,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 30,
        paddingTop: 10,
        backgroundColor: '#fff',
    },
    submitButton: {
        backgroundColor: '#E5E7EB',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonActive: {
        backgroundColor: '#FFD700',
    },
    submitButtonText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButtonTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
});