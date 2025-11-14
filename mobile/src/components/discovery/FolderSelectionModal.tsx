import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FolderSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFolder: (folder: string) => void;
  profileName: string;
}

const FOLDERS = [
  { id: 'Top Choice', label: 'Top Choice', icon: 'star', color: '#FFD700' },
  { id: 'Strong Maybe', label: 'Strong Maybe', icon: 'thumb-up', color: '#4CAF50' },
  { id: 'Considering', label: 'Considering', icon: 'thought-bubble', color: '#2196F3' },
  { id: 'Backup', label: 'Backup', icon: 'archive', color: '#9E9E9E' },
];

export const FolderSelectionModal: React.FC<FolderSelectionModalProps> = ({
  visible,
  onClose,
  onSelectFolder,
  profileName,
}) => {
  const handleFolderSelect = (folderId: string) => {
    onSelectFolder(folderId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContainer} testID="folder-selection-modal">
          <Pressable>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Save to Folder</Text>
              <Text style={styles.subtitle}>
                Where would you like to save {profileName}?
              </Text>
            </View>

            {/* Folder Options */}
            <View style={styles.folderList}>
              {FOLDERS.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  testID={`folder-${folder.id.toLowerCase().replace(' ', '-')}`}
                  style={styles.folderOption}
                  onPress={() => handleFolderSelect(folder.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.folderIconContainer}>
                    <Icon
                      name={folder.icon}
                      size={24}
                      color={folder.color}
                    />
                  </View>
                  <Text style={styles.folderLabel}>{folder.label}</Text>
                  <Icon
                    name="chevron-right"
                    size={24}
                    color="#999"
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  folderList: {
    paddingVertical: 8,
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
