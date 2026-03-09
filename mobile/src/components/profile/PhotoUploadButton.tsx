/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * PhotoUploadButton Component
 *
 * Circular avatar button that allows the user to upload or change their profile photo.
 * Displays the current photo (or initials placeholder) with a camera overlay badge.
 * Tapping shows an action sheet to pick from camera or photo library.
 *
 * Constitution Principle I: Parent photos ONLY - no child photo uploads.
 * Constitution Principle III: Photos uploaded via authenticated API with JWT.
 *
 * Dependencies:
 * - react-native-image-picker (^7.1.0) - Camera/library access
 * - react-native-vector-icons (^10.3.0) - MaterialCommunityIcons for camera/pencil icons
 * - photoUploadAPI - Shared apiClient with JWT interceptors
 *
 * Created: 2026-03-06
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Image,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { photoUploadAPI } from '../../services/api/photoUploadAPI';
import { colors, spacing, borderRadius } from '../../theme';

interface PhotoUploadButtonProps {
  /** Current profile photo URL (null/undefined shows initials placeholder) */
  currentPhotoUrl?: string | null;
  /** User's display initials for the placeholder (e.g. "JD") */
  initials?: string;
  /** Callback fired after a successful upload with the new photo URL */
  onUploadSuccess: (url: string) => void;
  /** Optional callback fired on upload failure */
  onUploadError?: (error: Error) => void;
  /** Diameter of the avatar circle in pixels (default: 100) */
  size?: number;
}

const PhotoUploadButton: React.FC<PhotoUploadButtonProps> = ({
  currentPhotoUrl,
  initials = '?',
  onUploadSuccess,
  onUploadError,
  size = 100,
}) => {
  const [uploading, setUploading] = useState(false);

  const handlePress = () => {
    Alert.alert('Update Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const launcher = source === 'camera' ? launchCamera : launchImageLibrary;

    const result: ImagePickerResponse = await launcher({
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri || !asset.type || !asset.fileName) {
      return;
    }

    setUploading(true);
    try {
      const response = await photoUploadAPI.uploadProfilePhoto({
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      });
      onUploadSuccess(response.data.profile_image_url);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      onUploadError?.(err);
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.', [
        { text: 'Retry', onPress: () => pickImage(source) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const halfSize = size / 2;
  const badgeSize = Math.max(28, size * 0.3);
  const badgeHalf = badgeSize / 2;

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size, borderRadius: halfSize }]}
      onPress={handlePress}
      disabled={uploading}
      testID="photo-upload-button"
      accessibilityLabel="Change profile photo"
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      {currentPhotoUrl ? (
        <Image
          source={{ uri: currentPhotoUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: halfSize }]}
          testID="profile-photo-image"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: halfSize },
          ]}
        >
          <Text style={[styles.placeholderText, { fontSize: size * 0.35 }]}>
            {initials}
          </Text>
        </View>
      )}

      {/* Upload spinner overlay */}
      {uploading && (
        <View style={[styles.overlay, { borderRadius: halfSize }]}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}

      {/* Camera edit badge (bottom-right corner, above verified badge area) */}
      <View
        style={[
          styles.editBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeHalf,
            top: 0,
            right: 0,
          },
        ]}
      >
        <Icon name="camera" size={badgeSize * 0.55} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  placeholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PhotoUploadButton;
