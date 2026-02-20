/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Documents Screen
 *
 * Display household document templates for download.
 * Features the Child Safety Agreement as a platform differentiator.
 *
 * Constitution: Principle I (Child Safety - templates include safety agreement)
 *
 * Created: 2026-01-21
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { RootState, AppDispatch } from '../../store';
import {
  fetchTemplates,
  getTemplateDownloadUrl,
} from '../../store/slices/householdSlice';
import { Template, TEMPLATE_CATEGORY_CONFIG } from '../../types/templates';

const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { templates, templatesLoading, templatesError, downloadingTemplateId } = useSelector(
    (state: RootState) => state.household
  );

  const [refreshing, setRefreshing] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchTemplates());
    setRefreshing(false);
  }, [dispatch]);

  // Handle template download
  const handleDownload = async (template: Template) => {
    try {
      const result = await dispatch(getTemplateDownloadUrl(template.id)).unwrap();

      // Open the download URL in browser/PDF viewer
      const canOpen = await Linking.canOpenURL(result.downloadUrl);
      if (canOpen) {
        await Linking.openURL(result.downloadUrl);
      } else {
        Alert.alert(
          'Cannot Open',
          'Unable to open the download link. Please try again later.'
        );
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error || 'Unable to download template. Please try again.');
    }
  };

  // Render template card
  const renderTemplateCard = ({ item: template }: { item: Template }) => {
    const categoryConfig = TEMPLATE_CATEGORY_CONFIG[template.category];
    const isDownloading = downloadingTemplateId === template.id;

    return (
      <TouchableOpacity
        style={[styles.templateCard, template.featured && styles.featuredCard]}
        onPress={() => handleDownload(template)}
        disabled={isDownloading}
        testID={`template-card-${template.id}`}
        accessibilityLabel={`Download ${template.name}`}
        accessibilityHint={`${template.pages} page PDF document`}
      >
        {/* Featured badge */}
        {template.featured && (
          <View style={styles.featuredBadge}>
            <Icon name="star" size={12} color={colors.background} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}

        <View style={styles.templateContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: categoryConfig.color + '20' }]}>
            <Icon name={categoryConfig.icon} size={24} color={categoryConfig.color} />
          </View>

          {/* Info */}
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.templateDescription} numberOfLines={2}>
              {template.description}
            </Text>
            <View style={styles.templateMeta}>
              <Text style={styles.metaText}>{template.pages} pages</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>PDF</Text>
              <Text style={styles.metaDot}>•</Text>
              <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '15' }]}>
                <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
                  {categoryConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Download button */}
          <View style={styles.downloadButton}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="download" size={24} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="file-document-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.emptyTitle}>No Templates Available</Text>
      <Text style={styles.emptySubtitle}>
        Templates will appear here once they are available.
      </Text>
    </View>
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>Templates</Text>
      <Text style={styles.sectionSubtitle}>
        Ready-to-use documents for your household
      </Text>
    </View>
  );

  // Render footer with "Coming Soon" section
  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.divider} />
      <View style={styles.comingSoonSection}>
        <View style={styles.comingSoonIcon}>
          <Icon name="cloud-upload-outline" size={24} color={colors.text.secondary} />
        </View>
        <View style={styles.comingSoonInfo}>
          <Text style={styles.comingSoonTitle}>My Documents</Text>
          <Text style={styles.comingSoonSubtitle}>
            Upload your signed agreements - coming soon
          </Text>
        </View>
      </View>
    </View>
  );

  // Show loading state
  if (templatesLoading && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container} testID="documents-screen">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (templatesError && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container} testID="documents-screen">
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Templates</Text>
          <Text style={styles.errorSubtitle}>{templatesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => dispatch(fetchTemplates())}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="documents-screen">
      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="templates-list"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background,
  },
  header: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  featuredCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    borderBottomRightRadius: borderRadius.sm,
  },
  featuredBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  templateName: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  templateDescription: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.disabled,
  },
  metaDot: {
    ...typography.caption,
    color: colors.text.disabled,
    marginHorizontal: spacing.xs,
  },
  categoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  downloadButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  comingSoonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  comingSoonIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonInfo: {
    marginLeft: spacing.md,
  },
  comingSoonTitle: {
    ...typography.subtitle1,
    color: colors.text.secondary,
  },
  comingSoonSubtitle: {
    ...typography.caption,
    color: colors.text.disabled,
    marginTop: spacing.xs,
  },
});

export default DocumentsScreen;
