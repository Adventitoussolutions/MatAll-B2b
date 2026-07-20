import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Trade {
  _id: string;
  name: string;
  isActive: boolean;
}

interface TradeDropdownModalProps {
  visible: boolean;
  trades: Trade[];
  selectedTrade: string;
  onSelect: (tradeName: string) => void;
  onClose: () => void;
}

export default function TradeDropdownModal({
  visible,
  trades,
  selectedTrade,
  onSelect,
  onClose,
}: TradeDropdownModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {trades.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No trades available</Text>
                </View>
              ) : (
                <FlatList
                  data={trades}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const isSelected = selectedTrade === item.name;
                    return (
                      <TouchableOpacity
                        style={styles.tradeItem}
                        onPress={() => {
                          onSelect(item.name);
                          onClose();
                        }}
                      >
                        <Text style={[styles.tradeText, isSelected && styles.tradeTextSelected]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listContent: {
    paddingVertical: 8,
  },
  tradeItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  tradeText: {
    fontSize: 16,
    color: '#333',
  },
  tradeTextSelected: {
    fontWeight: 'bold',
    color: '#007AFF', // Standard iOS blue
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
