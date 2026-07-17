import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VerificationCard from '../components/VerificationCard';

export default function VerifyAccountScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerTitle}>Verify your account</Text>
                <Text style={styles.headerSubtitle}>Required before you can accept orders</Text>

                <View style={styles.cardsContainer}>
                    <VerificationCard
                        title="Selfie"
                        subtitle="Live photo, no uploads"
                        status="pending"
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={() => {}}
                    />
                    <VerificationCard
                        title="Work video"
                        subtitle="15-sec clip of you at work"
                        status="pending"
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={() => {}}
                    />
                    <VerificationCard
                        title="Aadhaar"
                        subtitle="Optional, speeds up approval"
                        status="skipped"
                        icon={<View style={styles.placeholderIcon} />}
                        onPress={() => {}}
                    />
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Documents are encrypted and used only for verification. Never shared with third parties.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitButton} disabled={true}>
                    <Text style={styles.submitButtonText}>Submit for review</Text>
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
    submitButtonText: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '600',
    },
});