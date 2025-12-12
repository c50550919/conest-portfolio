import React, { useState, useEffect } from 'react';
import { adminAPI, VerificationDetail, FlaggedRecord } from '../services/api';

interface VerificationDetailModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerificationDetailModal: React.FC<VerificationDetailModalProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDetail();
  }, [userId]);

  const loadDetail = async () => {
    try {
      const response = await adminAPI.getVerification(userId);
      setDetail(response.data);
    } catch (err: any) {
      setError('Failed to load verification details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!notes.trim()) {
      setError('Please provide approval notes');
      return;
    }

    setProcessing(true);
    try {
      await adminAPI.approve(userId, notes);
      onSuccess();
    } catch (err: any) {
      setError('Failed to approve verification');
      console.error(err);
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      setError('Please provide rejection reason');
      return;
    }

    if (!window.confirm('This will reject the verification and process a full refund. Continue?')) {
      return;
    }

    setProcessing(true);
    try {
      await adminAPI.reject(userId, notes);
      onSuccess();
    } catch (err: any) {
      setError('Failed to reject verification');
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Verification Review</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={processing}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error && !detail ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          ) : detail ? (
            <>
              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{detail.user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-medium">{detail.user.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">User ID:</span>
                    <p className="font-mono text-xs">{detail.user.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p className="font-medium">{new Date(detail.user.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Login:</span>
                    <p className="font-medium">
                      {detail.user.last_login ? new Date(detail.user.last_login).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Verification Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">ID Verification:</span>
                    <p className="font-medium">
                      <span
                        className={`px-2 py-1 rounded ${
                          detail.verification.id_verification_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : detail.verification.id_verification_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {detail.verification.id_verification_status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Background Check:</span>
                    <p className="font-medium">
                      <span
                        className={`px-2 py-1 rounded ${
                          detail.verification.background_check_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : detail.verification.background_check_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : detail.verification.background_check_status === 'consider'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {detail.verification.background_check_status}
                      </span>
                    </p>
                  </div>
                  {detail.verification.certn_applicant_id && (
                    <div>
                      <span className="text-gray-600">Certn Applicant ID:</span>
                      <p className="font-mono text-xs">{detail.verification.certn_applicant_id}</p>
                    </div>
                  )}
                  {detail.verification.background_check_report_id && (
                    <div>
                      <span className="text-gray-600">Report ID:</span>
                      <p className="font-mono text-xs">{detail.verification.background_check_report_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Flagged Records */}
              {detail.flagged_records && detail.flagged_records.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    Flagged Records ({detail.flagged_records.length})
                  </h3>
                  <div className="space-y-3">
                    {detail.flagged_records.map((record: FlaggedRecord, index: number) => (
                      <div key={index} className="bg-white rounded p-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">Type:</span>
                            <p className="font-medium">{record.type}</p>
                          </div>
                          {record.date && (
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <p className="font-medium">{record.date}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <span className="text-gray-600">Description:</span>
                            <p className="font-medium">{record.description}</p>
                          </div>
                          {record.location && (
                            <div>
                              <span className="text-gray-600">Location:</span>
                              <p className="font-medium">{record.location}</p>
                            </div>
                          )}
                          {record.disposition && (
                            <div>
                              <span className="text-gray-600">Disposition:</span>
                              <p className="font-medium">{record.disposition}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {detail.payments && detail.payments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h3>
                  <div className="space-y-2 text-sm">
                    {detail.payments.map((payment: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">${(payment.amount / 100).toFixed(2)}</span>
                          <span className="text-gray-600 ml-2">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'succeeded'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'refunded'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (Required)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Provide detailed notes for this decision..."
                  disabled={processing}
                />
              </div>

              {error && detail && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleApprove}
                  disabled={processing || !notes.trim()}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {processing ? 'Processing...' : 'Approve Verification'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !notes.trim()}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {processing ? 'Processing...' : 'Reject & Refund'}
                </button>
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
