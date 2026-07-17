import React from "react"; // Sometimes required for React.ReactNode depending on your TS config
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface VerificationCardProps {
    title: string;
    subtitle: string;
    status: 'pending' | 'verified' | 'skipped' | string;
    icon: React.ReactNode;
    onPress: () => void;
}

// See the ": VerificationCardProps" added right here 👇
export default function VerificationCard({ title, subtitle, status, icon, onPress }: VerificationCardProps) {
    const getStatusStyle = () => {
        switch (status.toLowerCase()) {
            case 'verified':
                return { container: styles.verifiedPill, text: styles.verifiedText, label: 'Verified' };
            case 'skipped':
                return { container: styles.skippedPill, text: styles.skippedText, label: 'Skipped' };
            default:
                return { container: styles.pendingPill, text: styles.pendingText, label: 'Pending' };
        }
    };

    const statusStyle = getStatusStyle();

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            {icon}
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={statusStyle.container}>
                <Text style={statusStyle.text}>{statusStyle.label}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 4,
    },
    pendingPill: {
        backgroundColor: '#FEF3C7', // Light orange/yellow background
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    pendingText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#B45309', // Darker brown/orange text
    },
    verifiedPill: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    verifiedText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#059669',
    },
    skippedPill: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    skippedText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    }
});
