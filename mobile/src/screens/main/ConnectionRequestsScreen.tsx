/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Connection Requests Screen
 *
 * Purpose: View and respond to connection requests
 * Feature: 003-complete-3-critical (ConnectionRequests UI)
 * Task: T039
 *
 * Features:
 * - Tab navigation: Received, Sent
 * - List received requests with sender profiles
 * - Accept/decline with optional response message
 * - List sent requests with status badges
 * - Cancel pending requests
 * - Real-time notification handling via Socket.io
 * - Rate limit status (5/day, 15/week)
 *
 * Created: 2025-10-14
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  fetchReceivedRequests,
  fetchSentRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  fetchRateLimitStatus,
  fetchStatistics,
  getMessage,
  getResponseMessage,
  clearError,
} from '../../store/slices/connectionRequestsSlice';
import { ConnectionRequest } from '../../services/api/connectionRequestsAPI';
import { analytics, AnalyticsEvents } from '../../services/analytics';

type TabType = 'received' | 'sent';

const STATUS_COLORS = {
  pending: '#FFA500',
  accepted: '#4ECDC4',
  declined: '#FF6B6B',
  expired: '#999',
  cancelled: '#666',
};

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const ConnectionRequestsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const {
    receivedRequests,
    sentRequests,
    rateLimitStatus,
    statistics,
    loading,
    error,
    accepting,
    declining,
    cancelling,
  } = useSelector((state: RootState) => state.connectionRequests);

  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequest | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseType, setResponseType] = useState<'accept' | 'decline'>('accept');
  const [viewingMessage, setViewingMessage] = useState('');

  useEffect(() => {
    loadRequests();
    loadRateLimitStatus();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error]);

  const loadRequests = useCallback(() => {
    dispatch(fetchReceivedRequests() as any);
    dispatch(fetchSentRequests() as any);
  }, [dispatch]);

  const loadRateLimitStatus = useCallback(() => {
    dispatch(fetchRateLimitStatus() as any);
  }, [dispatch]);

  const loadStatistics = useCallback(() => {
    dispatch(fetchStatistics() as any);
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    loadRequests();
    loadRateLimitStatus();
    loadStatistics();
  }, [loadRequests, loadRateLimitStatus, loadStatistics]);

  const handleViewMessage = useCallback(
    async (request: ConnectionRequest, isResponse: boolean = false) => {
      try {
        let message: string | null;
        if (isResponse) {
          const result = await dispatch(getResponseMessage(request.id) as any);
          message = result.payload.responseMessage;
        } else {
          const result = await dispatch(getMessage(request.id) as any);
          message = result.payload.message;
        }

        if (message) {
          setViewingMessage(message);
          setSelectedRequest(request);
          setMessageModalVisible(true);
        } else {
          Alert.alert('Message', 'No message available');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load message');
      }
    },
    [dispatch],
  );

  const handleRespondToRequest = useCallback(
    (request: ConnectionRequest, type: 'accept' | 'decline') => {
      setSelectedRequest(request);
      setResponseType(type);
      setResponseMessage('');
      setResponseModalVisible(true);
    },
    [],
  );

  const handleSubmitResponse = useCallback(() => {
    if (!selectedRequest) {
      return;
    }

    const action =
      responseType === 'accept'
        ? acceptConnectionRequest({ id: selectedRequest.id, responseMessage })
        : declineConnectionRequest({ id: selectedRequest.id, reason: responseMessage });

    dispatch(action as any).then(() => {
      analytics.track(
        responseType === 'accept'
          ? AnalyticsEvents.CONNECTION_ACCEPTED
          : AnalyticsEvents.CONNECTION_DECLINED,
        { requestId: selectedRequest.id }
      );
      setResponseModalVisible(false);
      setSelectedRequest(null);
      setResponseMessage('');
      Alert.alert(
        'Success',
        responseType === 'accept'
          ? 'Connection request accepted! You can now message each other.'
          : 'Connection request declined.'
      );
    });
  }, [selectedRequest, responseType, responseMessage, dispatch]);

  const handleCancelRequest = useCallback(
    (request: ConnectionRequest) => {
      Alert.alert(
        'Cancel Request',
        `Are you sure you want to cancel your connection request to ${request.recipientProfile?.firstName}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => {
              dispatch(cancelConnectionRequest(request.id) as any);
            },
          },
        ],
      );
    },
    [dispatch],
  );

  const renderReceivedRequestCard = useCallback(
    ({ item }: { item: ConnectionRequest }) => {
      const isExpired = new Date(item.expires_at) < new Date();
      const canRespond = item.status === 'pending' && !isExpired;

      return (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>
                {item.senderProfile?.firstName || 'Unknown'}, {item.senderProfile?.age || '?'}
              </Text>
              <Text style={styles.requestLocation}>{item.senderProfile?.city || 'Unknown'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="heart" size={16} color="#FF6B6B" />
          </View>

          <View style={styles.requestStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.statText}>
                {item.senderProfile?.compatibilityScore || 0}% Match
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.messagePreview} onPress={() => handleViewMessage(item)}>
            <MaterialCommunityIcons name="message-text" size={16} color="#4ECDC4" />
            <Text style={styles.messageText}>Tap to read message</Text>
          </TouchableOpacity>

          <View style={styles.requestMeta}>
            <Text style={styles.requestDate}>
              Received {new Date(item.sent_at).toLocaleDateString()}
            </Text>
            {isExpired && (
              <Text style={styles.expiredText}>
                Expired {new Date(item.expires_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {canRespond && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleRespondToRequest(item, 'accept')}
                disabled={accepting}
              >
                {accepting && selectedRequest?.id === item.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleRespondToRequest(item, 'decline')}
                disabled={declining}
              >
                {declining && selectedRequest?.id === item.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {item.response_message_encrypted && (
            <TouchableOpacity
              style={styles.responsePreview}
              onPress={() => handleViewMessage(item, true)}
            >
              <MaterialCommunityIcons name="message-reply-text" size={16} color="#666" />
              <Text style={styles.responseText}>View your response</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [handleViewMessage, handleRespondToRequest, accepting, declining, selectedRequest],
  );

  const renderSentRequestCard = useCallback(
    ({ item }: { item: ConnectionRequest }) => {
      const canCancel = item.status === 'pending';

      return (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>
                {item.recipientProfile?.firstName || 'Unknown'}, {item.recipientProfile?.age || '?'}
              </Text>
              <Text style={styles.requestLocation}>{item.recipientProfile?.city || 'Unknown'}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
              </View>
            </View>
          </View>

          <View style={styles.requestStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.statText}>
                {item.recipientProfile?.compatibilityScore || 0}% Match
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.messagePreview} onPress={() => handleViewMessage(item)}>
            <MaterialCommunityIcons name="message-text" size={16} color="#4ECDC4" />
            <Text style={styles.messageText}>Tap to read your message</Text>
          </TouchableOpacity>

          <View style={styles.requestMeta}>
            <Text style={styles.requestDate}>
              Sent {new Date(item.sent_at).toLocaleDateString()}
            </Text>
            {item.responded_at && (
              <Text style={styles.respondedText}>
                Responded {new Date(item.responded_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelRequest(item)}
              disabled={cancelling}
            >
              {cancelling && selectedRequest?.id === item.id ? (
                <ActivityIndicator color="#666" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="cancel" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>Cancel Request</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.response_message_encrypted && (
            <TouchableOpacity
              style={styles.responsePreview}
              onPress={() => handleViewMessage(item, true)}
            >
              <MaterialCommunityIcons name="message-reply-text" size={16} color="#4ECDC4" />
              <Text style={styles.responseText}>View their response</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [handleViewMessage, handleCancelRequest, cancelling, selectedRequest],
  );

  const activeRequests = activeTab === 'received' ? receivedRequests : sentRequests;
  const renderCard = activeTab === 'received' ? renderReceivedRequestCard : renderSentRequestCard;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connection Requests</Text>
        {rateLimitStatus && (
          <View style={styles.rateLimitBadge}>
            <Text style={styles.rateLimitText}>
              {rateLimitStatus.daily}/5 today • {rateLimitStatus.weekly}/15 week
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <MaterialCommunityIcons
            name="inbox"
            size={20}
            color={activeTab === 'received' ? '#4ECDC4' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Received ({receivedRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={activeTab === 'sent' ? '#4ECDC4' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {statistics && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsBar}
          contentContainerStyle={styles.statsContent}
        >
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>
              {activeTab === 'received' ? statistics.received.pending : statistics.sent.pending}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Accepted</Text>
            <Text style={styles.statValue}>
              {activeTab === 'received' ? statistics.received.accepted : statistics.sent.accepted}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Declined</Text>
            <Text style={styles.statValue}>
              {activeTab === 'received' ? statistics.received.declined : statistics.sent.declined}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Requests List */}
      {loading && activeRequests.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : activeRequests.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="email-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>
            No {activeTab === 'received' ? 'received' : 'sent'} requests
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'received'
              ? 'Connection requests you receive will appear here'
              : 'Send connection requests from profile details'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={['#4ECDC4']} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {responseType === 'accept' ? 'Accept Request' : 'Decline Request'}
              </Text>
              <TouchableOpacity onPress={() => setResponseModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {responseType === 'accept'
                ? 'Add an optional message to your acceptance'
                : 'Add an optional reason for declining (optional)'}
            </Text>

            <TextInput
              style={styles.responseInput}
              multiline
              numberOfLines={4}
              placeholder={
                responseType === 'accept'
                  ? "Thanks! I'd love to connect..."
                  : 'Thanks for reaching out...'
              }
              value={responseMessage}
              onChangeText={setResponseMessage}
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>{responseMessage.length}/500</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setResponseModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  responseType === 'accept' ? styles.acceptModalButton : styles.declineModalButton,
                  (accepting || declining) && styles.modalButtonDisabled,
                ]}
                onPress={handleSubmitResponse}
                disabled={accepting || declining}
              >
                {accepting || declining ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {responseType === 'accept' ? 'Accept' : 'Decline'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message View Modal */}
      <Modal
        visible={messageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message</Text>
              <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.messageContainer}>
              <Text style={styles.messageContent}>{viewingMessage}</Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.closeModalButton]}
              onPress={() => setMessageModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  rateLimitBadge: {
    backgroundColor: '#E0F7F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rateLimitText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4ECDC4',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  statsBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  responsePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginTop: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  expiredText: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  respondedText: {
    fontSize: 12,
    color: '#4ECDC4',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#4ECDC4',
  },
  declineButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#F9F9F9',
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F0F0F0',
  },
  acceptModalButton: {
    backgroundColor: '#4ECDC4',
  },
  declineModalButton: {
    backgroundColor: '#FF6B6B',
  },
  closeModalButton: {
    backgroundColor: '#4ECDC4',
    marginTop: 16,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  messageContainer: {
    maxHeight: 300,
    marginVertical: 16,
  },
  messageContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default ConnectionRequestsScreen;
