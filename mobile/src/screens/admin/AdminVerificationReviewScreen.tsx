/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { API_URL } from '../../config/api';
import { getSecureItem } from '../../utils/secureStorage';

/**
 * Admin Verification Review Screen
 *
 * Features:
 * - View verification queue requiring manual review
 * - Review flagged background check records
 * - Approve or reject verifications
 * - SLA tracking (48-hour review requirement)
 *
 * Security:
 * - Requires admin role
 * - JWT authentication
 * - All actions logged with admin user ID
 */

interface VerificationQueueItem {
  id: string;
  user_id: string;
  background_check_status: string;
  flagged_records: any[];
  admin_review_required: boolean;
  background_check_date: string;
  user: {
    email: string;
    phone: string;
  };
  payment_status: string;
  sla_hours_remaining: number;
}

export const AdminVerificationReviewScreen = () => {
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VerificationQueueItem | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const token = await getSecureItem('accessToken');
      const response = await fetch(`${API_URL}/admin/verifications/queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }

      const data = await response.json();
      setQueue(data.data.queue);
    } catch (error) {
      console.error('Failed to fetch verification queue:', error);
      Alert.alert('Error', 'Failed to load verification queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handleApprove = async (userId: string) => {
    try {
      const token = await getSecureItem('accessToken');
      const response = await fetch(`${API_URL}/admin/verifications/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: 'Approved after manual review',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve verification');
      }

      Alert.alert('Success', 'Verification approved');
      fetchQueue(); // Refresh queue
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to approve verification:', error);
      Alert.alert('Error', 'Failed to approve verification');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const token = await getSecureItem('accessToken');
      const response = await fetch(`${API_URL}/admin/verifications/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: 'Rejected after manual review',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject verification');
      }

      Alert.alert('Success', 'Verification rejected and refund processed');
      fetchQueue(); // Refresh queue
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to reject verification:', error);
      Alert.alert('Error', 'Failed to reject verification');
    }
  };

  const renderQueueItem = ({ item }: { item: VerificationQueueItem }) => {
    const slaColor =
      item.sla_hours_remaining < 12
        ? '#dc2626'
        : item.sla_hours_remaining < 24
          ? '#f59e0b'
          : '#10b981';

    return (
      <TouchableOpacity style={styles.queueItem} onPress={() => setSelectedItem(item)}>
        <View style={styles.queueItemHeader}>
          <Text style={styles.userEmail}>{item.user.email}</Text>
          <View style={[styles.slaBadge, { backgroundColor: slaColor }]}>
            <Text style={styles.slaText}>{item.sla_hours_remaining.toFixed(1)}h</Text>
          </View>
        </View>
        <Text style={styles.userPhone}>{item.user.phone}</Text>
        <Text style={styles.flaggedCount}>
          {item.flagged_records?.length || 0} flagged record(s)
        </Text>
        <Text style={styles.paymentStatus}>Payment: {item.payment_status}</Text>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) {
      return null;
    }

    return (
      <View style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Verification Review</Text>

          <Text style={styles.sectionTitle}>User Information</Text>
          <Text>Email: {selectedItem.user.email}</Text>
          <Text>Phone: {selectedItem.user.phone}</Text>
          <Text>User ID: {selectedItem.user_id}</Text>

          <Text style={styles.sectionTitle}>Flagged Records</Text>
          {selectedItem.flagged_records?.map((record, index) => (
            <View key={index} style={styles.flaggedRecord}>
              <Text>Type: {record.type}</Text>
              <Text>Description: {record.description}</Text>
              <Text>Date: {record.date || 'N/A'}</Text>
              <Text>Location: {record.location || 'N/A'}</Text>
            </View>
          ))}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.approveButton]}
              onPress={() => {
                Alert.alert(
                  'Confirm Approval',
                  'Are you sure you want to approve this verification?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Approve',
                      onPress: () => handleApprove(selectedItem.user_id),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => {
                Alert.alert(
                  'Confirm Rejection',
                  'This will reject the verification and process a full refund. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reject',
                      style: 'destructive',
                      onPress: () => handleReject(selectedItem.user_id),
                    },
                  ]
                );
              }}
            >
              <Text style={styles.buttonText}>Reject & Refund</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Verification Review Queue</Text>
      <Text style={styles.subheader}>{queue.length} verification(s) pending review</Text>

      <FlatList
        data={queue}
        renderItem={renderQueueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No verifications pending review</Text>
          </View>
        }
      />

      {selectedItem && renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
  },
  subheader: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  queueItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  userPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  flaggedCount: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 12,
    color: '#6b7280',
  },
  slaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  slaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  flaggedRecord: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminVerificationReviewScreen;
