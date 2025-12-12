import React, { useState, useEffect } from 'react';
import { adminAPI, VerificationQueueItem } from '../services/api';
import { VerificationDetailModal } from './VerificationDetailModal';

export const VerificationQueue: React.FC = () => {
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = async () => {
    try {
      setError('');
      const response = await adminAPI.getQueue();
      setQueue(response.data.queue);
    } catch (err: any) {
      setError('Failed to load verification queue');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  const getSLAColor = (hoursRemaining: number): string => {
    if (hoursRemaining < 12) return 'bg-red-500';
    if (hoursRemaining < 24) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getSLATextColor = (hoursRemaining: number): string => {
    if (hoursRemaining < 12) return 'text-red-700';
    if (hoursRemaining < 24) return 'text-orange-700';
    return 'text-green-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verification Queue</h2>
          <p className="text-gray-600 mt-1">{queue.length} verification(s) pending review</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No verifications pending</h3>
          <p className="mt-1 text-sm text-gray-500">All verifications have been reviewed!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flagged Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queue.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.user.email}</div>
                    <div className="text-sm text-gray-500">ID: {item.user_id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.user.phone || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {item.flagged_records?.length || 0} record(s)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.payment_status === 'succeeded'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`h-2 w-2 rounded-full ${getSLAColor(item.sla_hours_remaining)} mr-2`}></span>
                      <span className={`text-sm font-medium ${getSLATextColor(item.sla_hours_remaining)}`}>
                        {item.sla_hours_remaining.toFixed(1)}h
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedUserId(item.user_id)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedUserId && (
        <VerificationDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onSuccess={() => {
            setSelectedUserId(null);
            loadQueue();
          }}
        />
      )}
    </div>
  );
};
