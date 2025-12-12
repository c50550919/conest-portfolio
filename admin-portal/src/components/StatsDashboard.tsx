import React, { useState, useEffect } from 'react';
import { adminAPI, VerificationStats } from '../services/api';

export const StatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        {error || 'No statistics available'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Statistics Overview</h2>

      {/* Verification Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total"
            value={stats.verifications.total}
            icon="📊"
            color="bg-blue-500"
          />
          <StatCard
            title="Fully Verified"
            value={stats.verifications.fully_verified}
            icon="✅"
            color="bg-green-500"
          />
          <StatCard
            title="Approved"
            value={stats.verifications.bg_approved}
            icon="👍"
            color="bg-green-500"
          />
          <StatCard
            title="Pending Review"
            value={stats.verifications.pending_review}
            icon="⏳"
            color="bg-orange-500"
          />
          <StatCard
            title="Rejected"
            value={stats.verifications.bg_rejected}
            icon="❌"
            color="bg-red-500"
          />
          <StatCard
            title="Requiring Review"
            value={stats.verifications.bg_consider}
            icon="⚠️"
            color="bg-yellow-500"
          />
          <StatCard
            title="Average Score"
            value={stats.verifications.avg_score.toFixed(1)}
            icon="📈"
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Payment Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Payments"
            value={stats.payments.total_payments}
            icon="💳"
            color="bg-blue-500"
          />
          <StatCard
            title="Successful"
            value={stats.payments.successful_payments}
            icon="✅"
            color="bg-green-500"
          />
          <StatCard
            title="Total Revenue"
            value={`$${(stats.payments.total_revenue / 100).toFixed(2)}`}
            icon="💰"
            color="bg-green-600"
          />
          <StatCard
            title="Total Refunded"
            value={`$${(stats.payments.total_refunded / 100).toFixed(2)}`}
            icon="↩️"
            color="bg-orange-500"
          />
          <StatCard
            title="Refund Rate"
            value={`${stats.payments.refund_rate.toFixed(1)}%`}
            icon="📉"
            color={stats.payments.refund_rate > 10 ? 'bg-red-500' : 'bg-yellow-500'}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600">Verification Completion Rate</span>
            <span className="font-semibold">
              {stats.verifications.total > 0
                ? ((stats.verifications.fully_verified / stats.verifications.total) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600">Approval Rate</span>
            <span className="font-semibold">
              {stats.verifications.total > 0
                ? ((stats.verifications.bg_approved / stats.verifications.total) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600">Rejection Rate</span>
            <span className="font-semibold">
              {stats.verifications.total > 0
                ? ((stats.verifications.bg_rejected / stats.verifications.total) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Revenue Per Payment</span>
            <span className="font-semibold">
              $
              {stats.payments.successful_payments > 0
                ? (stats.payments.total_revenue / 100 / stats.payments.successful_payments).toFixed(2)
                : '0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} text-white text-3xl p-3 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
};
