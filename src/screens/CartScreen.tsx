import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import LocationModal from '../components/LocationModal';
import OfflineBanner from '../components/OfflineBanner';
import QtySelector from '../components/QtySelector';
import { Colors } from '../constants/Colors';
import { Jobsite, useAuth } from '../context/AuthContext';
import { CartItem, useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useSettings } from '../context/SettingsContext';
import { getFullImageUrl } from '../utils/imageUrl';
import { findMatchingJobsite } from '../utils/locationUtils';
import { safeParsePrice } from '../utils/priceUtils';
import { isServiceOffline as checkServiceOffline } from '../utils/serviceStatus';


const { width } = Dimensions.get('window');



type CartItemRowProps = {
    item: CartItem;
    updateQuantity: (id: string, delta: number) => void;
    setQuantity: (id: string, qty: number) => void;
    handleMoveToWishlist: (item: CartItem) => void;
    navigation: any;
};

const CartItemRow = ({ item, updateQuantity, setQuantity, handleMoveToWishlist, navigation }: CartItemRowProps) => {
    return (
        <View style={styles.itemCard}>
            {/* Removed redundant delivery badge as it's shown in the top summary banner */}


            <TouchableOpacity
                style={styles.itemMain}
                onPress={() => navigation.navigate('Details', { productId: item.parentProductId || item.productId || item.id })}
            >
                <Image source={{ uri: getFullImageUrl(item.image || item.imageUrl) }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemVariant}>{item.selectedVariant}</Text>
                    <View style={styles.itemActionRow}>
                        <QtySelector
                            quantity={item.quantity}
                            onUpdate={(delta) => updateQuantity(item.id, delta)}
                            onSet={(val) => setQuantity(item.id, val)}
                            containerStyle={styles.qtySelectorSmall}
                            btnStyle={styles.qtyBtnSmall}
                            inputStyle={styles.qtyInputSmall}
                            iconColor={Colors.status.successGreen}
                            iconSize={16}
                        />
                        <View style={styles.itemActionSeparator} />
                        <TouchableOpacity onPress={() => handleMoveToWishlist(item)}>
                            <Text style={styles.wishlistLink}>Move to wishlist</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={[styles.itemFooter, { justifyContent: 'flex-end' }]}>
                <Text style={styles.itemPrice}>₹{(safeParsePrice(item.price) * item.quantity).toFixed(2)}</Text>
            </View>
        </View>
    );
};

export default function CartScreen({ navigation }: { navigation: any }) {
    const insets = useSafeAreaInsets();
    const { cart, updateQuantity, setQuantity, removeFromCart, calculations, loading, deliveryAddress, setDeliveryAddress, setIsManualSelection } = useCart();
    const { user } = useAuth();
    const { settings, serverTimeOffset } = useSettings();

    const { toggleFavorite, isFavorite } = useFavorites();
    const [locationModalVisible, setLocationModalVisible] = React.useState(false);
    const [showLoyaltyModal, setShowLoyaltyModal] = React.useState(false);
    const [selectedAddress, setSelectedAddress] = React.useState<Jobsite | null>(
        deliveryAddress || (user?.jobsites && user.jobsites.length > 0 ? user.jobsites[0] : null)
    );
    const isServiceOffline = React.useMemo(() => checkServiceOffline(settings as any, serverTimeOffset), [settings, serverTimeOffset]);


    // Sync with global address if it changes

    React.useEffect(() => {
        if (deliveryAddress) {
            setSelectedAddress(deliveryAddress);
        }
    }, [deliveryAddress]);

    const handleLocationSelect = (
        address: string,
        coords: { latitude: number; longitude: number },
        extraDetails?: { pincode?: string; city?: string; name?: string; contactPhone?: string; jobsite?: Jobsite; isManual?: boolean }
    ) => {
        const manualVal = extraDetails?.isManual !== undefined ? extraDetails.isManual : true;
        setIsManualSelection(manualVal);

        const existingJobsite = extraDetails?.jobsite || findMatchingJobsite(user?.jobsites, coords.latitude, coords.longitude, address);

        const newAddr = existingJobsite || {
            name: extraDetails?.name || 'Selected Location',
            contactPhone: extraDetails?.contactPhone || user?.phoneNumber || '',
            addressText: address,
            pincode: extraDetails?.pincode || '',
            city: extraDetails?.city || '',
            location: {
                type: 'Point',
                coordinates: [coords.longitude, coords.latitude]
            }
        };
        setSelectedAddress(newAddr as Jobsite);
        setDeliveryAddress(newAddr);
    };

    const handleMoveToWishlist = async (item: CartItem) => {
        if (!user) {
            Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please login to use wishlist.' });
            return;
        }
        await toggleFavorite(item);
        removeFromCart(item.id);
        Toast.show({ type: 'success', text1: 'Moved to wishlist' });
    };

    const handleCheckout = () => {
        const rootNav = navigation.getParent() || navigation;
        if (!user) {
            rootNav.navigate('Login', { returnTo: 'Checkout' });
            return;
        }
        if (!selectedAddress) {
            setLocationModalVisible(true);
            return;
        }
        rootNav.navigate('Checkout');
    };

    const {
        totalAmount = 0,
        totalBaseAmount = 0,
        totalTaxAmount = 0,
        deliveryCharge = 0,
        deliveryChargeBreakup = { base: 0, gst: 0 },
        platformFee = 0,
        vehicleClass = 'Bike',
        appliedOffers = [],
        rewardItems = [],
        totalSavings = 0,
        appliedDiscount = 0,
        loyalty
    } = (calculations || {}) as any;

    const maxDeliveryTime = (calculations as any)?.maxDeliveryTime || null;


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        const rootNav = navigation.getParent() || navigation;
                        rootNav.navigate('Main', { tab: 'Shop' });
                    }}>
                        <Ionicons name="arrow-back" size={24} color={Colors.black} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Cart</Text>
                    <View style={{ width: 24 }} />
                </View>

                {isServiceOffline && (
                    <OfflineBanner message={settings?.offlineMessage} />
                )}


                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="basket-outline" size={20} color={Colors.black} />
                        <Text style={styles.sectionHeaderText}>CART ITEMS</Text>
                    </View>

                    {cart.length > 0 && maxDeliveryTime && (
                        <View style={styles.topInfoBanner}>
                            <View style={styles.timerIconCircle}>
                                <Ionicons name="time-outline" size={20} color={Colors.black} />
                            </View>
                            <View>
                                <Text style={styles.infoTitle}>Delivery in {maxDeliveryTime}</Text>
                                <Text style={styles.infoSubtitle}>Estimated shipment of {cart.length} item{cart.length > 1 ? 's' : ''}</Text>
                            </View>
                        </View>
                    )}

                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <MaterialCommunityIcons name="cart-off" size={80} color={Colors.border.medium} />
                            <Text style={styles.emptyText}>Your cart is empty</Text>
                            <TouchableOpacity
                                style={styles.browseBtn}
                                onPress={() => {
                                    const rootNav = navigation.getParent() || navigation;
                                    rootNav.navigate('Main', { tab: 'Shop' });
                                }}
                            >
                                <Text style={styles.browseBtnText}>Browse Materials</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        cart.map((item) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                updateQuantity={updateQuantity}
                                setQuantity={setQuantity}
                                handleMoveToWishlist={handleMoveToWishlist}
                                navigation={navigation}
                            />
                        ))
                    )}

                    {/* Bill Summary */}
                    {cart.length > 0 && (
                        <View style={styles.billCard}>
                            <View style={styles.billHeaderRow}>
                                <Text style={styles.billTitle}>Bill Summary</Text>
                            </View>

                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Item Total (Excl. GST)</Text>
                                <Text style={styles.billValue}>₹{safeParsePrice(totalBaseAmount).toFixed(2)}</Text>
                            </View>

                            <View style={styles.billRow}>
                                <Text style={styles.billLabelSmall}>GST Amount</Text>
                                <Text style={styles.billValueSmall}>₹{safeParsePrice(totalTaxAmount).toFixed(2)}</Text>
                            </View>

                            <View style={styles.billRow}>
                                <View>
                                    <View style={styles.labelWithIcon}>
                                        <MaterialCommunityIcons
                                            name={vehicleClass === 'Truck' || vehicleClass === 'Flatbed Truck' || vehicleClass === 'Pickup Truck' ? "truck-outline" : "motorbike"}
                                            size={16}
                                            color={Colors.text.muted}
                                        />
                                        <Text style={[styles.billLabel, { marginLeft: 6 }]}>Delivery Charge</Text>
                                    </View>
                                    <Text style={styles.billSubLabel}>
                                        Mode: {vehicleClass} {deliveryCharge > 0 ? `(₹${safeParsePrice(deliveryChargeBreakup.base).toFixed(2)} + ₹${safeParsePrice(deliveryChargeBreakup.gst).toFixed(2)} GST)` : ''}
                                    </Text>
                                </View>
                                {deliveryCharge > 0 ? (
                                    <Text style={styles.billValue}>₹{safeParsePrice(deliveryCharge).toFixed(2)}</Text>
                                ) : (
                                    <Text style={[styles.billValue, { color: Colors.status.successGreen }]}>
                                        <Text style={{ textDecorationLine: 'line-through', color: Colors.text.muted, fontSize: 12, fontWeight: 'normal' }}>₹150</Text> FREE
                                    </Text>
                                )}
                            </View>

                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Handling Charge (incl GST)</Text>
                                <Text style={styles.billValue}>₹{safeParsePrice(platformFee).toFixed(2)}</Text>
                            </View>

                            {/* {isRentalPackage && (
                                <>
                                    <View style={styles.billRow}>
                                        <View>
                                            <Text style={styles.billLabel}>Rental Installation Support</Text>
                                            <Text style={styles.billSubLabel}>Bundled setup for selected materials</Text>
                                        </View>
                                        <Text style={[styles.billValue, rentalInstallationFee === 0 && { color: Colors.status.successGreen }]}>
                                            {rentalInstallationFee > 0 ? `₹${safeParsePrice(rentalInstallationFee).toFixed(2)}` : 'FREE'}
                                        </Text>
                                    </View>
                                    {rentalInstallationBreakup && rentalInstallationBreakup.length > 0 && (
                                        <View style={styles.installationBreakupContainer}>
                                            {rentalInstallationBreakup.map((breakupItem: any, index: number) => (
                                                <View key={index} style={styles.breakupRow}>
                                                    <Text style={styles.breakupLabel}>• {breakupItem.name} (x{breakupItem.quantity})</Text>
                                                    <Text style={styles.breakupValue}>
                                                        {breakupItem.isFree ? 'Free' : `₹${(breakupItem.rate * breakupItem.quantity).toFixed(2)}`}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )} */}

                            {appliedDiscount > 0 && (
                                <View style={styles.billRow}>
                                    <Text style={[styles.billLabel, { color: Colors.status.successGreen }]}>Offer Discount</Text>
                                    <Text style={[styles.billValue, { color: Colors.status.successGreen }]}>-₹{safeParsePrice(appliedDiscount).toFixed(2)}</Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.billRow}>
                                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                                <Text style={styles.grandTotalValue}>₹{safeParsePrice(totalAmount).toFixed(2)}</Text>
                            </View>
                        </View>
                    )}

                    {/* {cart.length > 0 && totalSavings > 0 && (
                        <View style={styles.savingsBox}>
                            <Text style={styles.savingsBoxLabel}>Your total savings</Text>
                            <Text style={styles.savingsBoxValue}>₹{totalSavings.toFixed(2)}</Text>
                        </View>
                    )} */}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Bar */}
                {cart.length > 0 && (
                    <View style={styles.bottomBar}>
                        <View style={styles.deliveryInfo}>
                            <View style={styles.locIconBox}>
                                <Ionicons name="location" size={16} color={Colors.text.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.deliveringTo}>
                                    {selectedAddress ? `Delivering to ${selectedAddress.recipientName || selectedAddress.name || user?.fullName || 'Customer'}` : 'Select Address'}
                                </Text>
                                <Text style={styles.addressText} numberOfLines={1}>
                                    {selectedAddress ? (selectedAddress.addressText || selectedAddress.fullAddress || selectedAddress.address) : 'No location selected'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setLocationModalVisible(true)}>
                                <Text style={styles.changeText}>Change</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.nextStepBtn,
                                (loading || isServiceOffline) && { opacity: 0.7 }
                            ]}
                            onPress={handleCheckout}
                            disabled={loading || isServiceOffline}
                        >

                            <View style={styles.nextPriceBox}>
                                {loading ? (
                                    <ActivityIndicator color={Colors.white} size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.nextPrice}>₹{safeParsePrice(totalAmount).toFixed(2)}</Text>
                                        <Text style={styles.nextStepText}>NEXT STEP</Text>
                                    </>
                                )}
                            </View>
                            <View style={styles.nextArrowBox}>
                                <Text style={styles.nextLabel}>Next</Text>
                                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
            <LocationModal
                visible={locationModalVisible}
                onClose={() => setLocationModalVisible(false)}
                onSelectAddress={handleLocationSelect}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.secondary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.white,
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.black },

    topInfoBanner: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    timerIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    infoTitle: { fontSize: 15, fontWeight: '800', color: Colors.black },
    infoSubtitle: { fontSize: 12, color: Colors.text.muted, marginTop: 2 },

    billCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 20,
        marginBottom: 16,
    },
    billHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    billTitle: { fontSize: 16, fontWeight: '900', color: Colors.black },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    labelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    billLabel: { fontSize: 14, color: Colors.text.primary, fontWeight: '600' },
    billLabelSmall: { fontSize: 13, color: Colors.text.muted },
    billValue: { fontSize: 14, fontWeight: '800', color: Colors.black },
    billValueSmall: { fontSize: 13, fontWeight: '700', color: Colors.black },
    billSubLabel: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },
    divider: { height: 1, backgroundColor: Colors.border.light, borderStyle: 'dashed', marginVertical: 15, borderWidth: 0.5, borderColor: Colors.border.dark },
    grandTotalLabel: { fontSize: 18, fontWeight: '900', color: Colors.black },
    grandTotalValue: { fontSize: 18, fontWeight: '900', color: Colors.black },

    savingsBox: {
        backgroundColor: Colors.background.success,
        borderRadius: 15,
        marginHorizontal: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.status.successGreen,
        marginBottom: 16,
    },
    savingsBoxLabel: { fontSize: 14, fontWeight: '700', color: Colors.text.success },
    savingsBoxValue: { fontSize: 16, fontWeight: '900', color: Colors.text.success },

    progressBarBg: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.status.info,
    },
    loyaltyHint: {
        fontSize: 11,
        color: '#64748B',
        lineHeight: 16,
    },
    rewardSummaryBox: {
        marginTop: 10,
        marginBottom: 15,
    },
    rewardHead: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.black,
        marginBottom: 8,
    },
    rewardList: {
        gap: 6,
    },
    rewardItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rewardItemText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.ui.purple,
        marginLeft: 6,
    },

    scrollView: { flex: 1 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    sectionHeaderText: { fontSize: 13, fontWeight: '900', color: Colors.text.primary, marginLeft: 8 },

    itemCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
    },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background.warning,
        padding: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    timerIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.background.warning,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    deliveryTime: { fontSize: 14, fontWeight: '800', color: Colors.black },
    shipmentText: { fontSize: 11, color: Colors.text.muted },

    itemMain: { flexDirection: 'row', marginBottom: 16 },
    itemImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: Colors.background.secondary },
    itemInfo: { flex: 1, marginLeft: 15 },
    itemName: { fontSize: 15, fontWeight: '800', color: Colors.black, marginBottom: 4 },
    itemVariant: { fontSize: 12, color: Colors.text.muted, lineHeight: 18, marginBottom: 8 },
    itemActionRow: { flexDirection: 'row', alignItems: 'center' },
    itemActionSeparator: { width: 1, height: 12, backgroundColor: Colors.border.medium, marginHorizontal: 10 },
    changeOptionText: { fontSize: 12, fontWeight: '800', color: Colors.status.successGreen },
    wishlistLink: { fontSize: 12, fontWeight: '800', color: Colors.status.successGreen },

    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    qtySelectorSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 4,
        height: 32,
        borderWidth: 1,
        borderColor: Colors.border.medium,
    },
    qtyBtnSmall: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
    qtyInputSmall: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.text.primary,
        marginHorizontal: 8,
        minWidth: 20,
        textAlign: 'center',
    },
    itemPrice: { fontSize: 16, fontWeight: '900', color: Colors.black },

    bottomBar: {
        backgroundColor: Colors.white,
        paddingTop: 8,
        paddingHorizontal: 12,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border.light,
        elevation: 10,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },

    deliveryInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    locIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background.warning, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    deliveringTo: { fontSize: 10, fontWeight: '800', color: Colors.text.muted, marginBottom: 2 },
    addressText: { fontSize: 11, fontWeight: '700', color: Colors.black, flex: 1 },
    changeText: { fontSize: 12, fontWeight: '800', color: Colors.status.successGreen },

    nextStepBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.status.successGreen,
        borderRadius: 15,
        padding: 12,
        height: 60,
    },
    nextPriceBox: { flex: 1 },
    nextPrice: { fontSize: 18, fontWeight: '900', color: Colors.white },
    nextStepText: { fontSize: 10, fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },
    nextArrowBox: { flexDirection: 'row', alignItems: 'center' },
    nextLabel: { fontSize: 18, fontWeight: '800', color: Colors.white, marginRight: 8 },

    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: '50%' // Fallback for vertical centering in ScrollView
    },
    emptyText: { fontSize: 16, color: Colors.text.muted, marginTop: 20, marginBottom: 30, textAlign: 'center' },
    browseBtn: { backgroundColor: Colors.black, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
    browseBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
    loyaltyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loyaltyModalContent: {
        backgroundColor: Colors.white,
        width: '90%',
        borderRadius: 30,
        overflow: 'hidden',
    },
    loyaltyModalHeader: {
        backgroundColor: Colors.primary,
        padding: 30,
        alignItems: 'center',
    },
    loyaltyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    loyaltyCloseBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 5,
    },
    loyaltyModalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.black,
        marginBottom: 8,
    },
    loyaltyModalSub: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.6)',
        textAlign: 'center',
    },
    loyaltyModalBody: {
        padding: 25,
    },
    loyaltyDetailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    loyaltyDetailText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text.primary,
        marginLeft: 10,
        lineHeight: 20,
    },
    loyaltyDisclaimer: {
        backgroundColor: '#FFFBEB',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: 25,
    },
    loyaltyDisclaimerText: {
        fontSize: 11,
        color: '#92400E',
        textAlign: 'center',
        fontWeight: '700',
    },
    loyaltyClaimBtn: {
        backgroundColor: Colors.black,
        paddingVertical: 18,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    loyaltyClaimBtnText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '900',
    },
    qtyPriceBox: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
