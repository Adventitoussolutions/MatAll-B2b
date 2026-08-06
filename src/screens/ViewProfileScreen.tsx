import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { B2B_POLICIES_URL } from '../config';

export default function ViewProfileScreen() {
    const { user, logout } = useAuth();
    const navigation = useNavigation<any>();
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    // We get the base URL from the api configuration for the image URL
    const baseURL = api.defaults.baseURL || 'http://192.168.1.5:5001';

    const b2b = user?.b2bContractor;
    const profilePictureUrl = b2b?.profilePictureUrl 
        ? `${baseURL}${b2b.profilePictureUrl}`
        : null;

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            const response = await api.delete('/api/b2b/auth/profile');
                            Alert.alert('Success', response.data?.message || 'Account deleted successfully', [
                                {
                                    text: 'OK',
                                    onPress: async () => {
                                        await logout();
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: 'Login' }],
                                        });
                                    }
                                }
                            ]);
                        } catch (err: any) {
                            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete account';
                            Alert.alert('Delete Failed', errorMsg);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {profilePictureUrl ? (
                            <Image 
                                source={{ uri: profilePictureUrl }} 
                                style={styles.avatarImage} 
                            />
                        ) : (
                            <Feather name="user" size={50} color={Colors.text.muted} />
                        )}
                    </View>
                    
                    <Text style={styles.nameText}>{b2b?.name || user?.fullName || 'N/A'}</Text>
                    <Text style={styles.tradeText}>{b2b?.trade || 'No Trade Selected'}</Text>
                </View>

                {/* Additional details */}
                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={20} color={Colors.text.secondary} />
                        <Text style={styles.detailText}>{user?.phoneNumber || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="briefcase-outline" size={20} color={Colors.text.secondary} />
                        <Text style={styles.detailText}>{user?.role || 'N/A'}</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.detailRow, { borderBottomWidth: 0 }]}
                        onPress={() => Linking.openURL(B2B_POLICIES_URL)}
                    >
                        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.text.secondary} />
                        <Text style={styles.detailText}>Terms of Service & Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.text.muted} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity 
                    style={styles.logoutButton} 
                    onPress={async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }}
                >
                    <Feather name="log-out" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity 
                    style={[styles.deleteButton, { marginTop: 12 }]} 
                    onPress={handleDeleteAccount}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <>
                            <Feather name="trash-2" size={20} color="#EF4444" />
                            <Text style={styles.deleteText}>Delete Account</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    header: {
        backgroundColor: Colors.white,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text.primary,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    profileCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 20,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.border.light,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    nameText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    tradeText: {
        fontSize: 16,
        color: '#EAB308', // fallback since primary is bright yellow, gold looks better here
        fontWeight: '600',
    },
    detailsContainer: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 20,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 30,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
    },
    detailText: {
        fontSize: 16,
        color: Colors.text.primary,
        marginLeft: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5', // Light red border
    },
    logoutText: {
        color: '#EF4444', // Red text
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2', // Extremely light red background
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    deleteText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});
