import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { Transaction } from '../types';
import apiService from '../services/api';

const AdminPanel: React.FC = () => {
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingTransactions();
  }, []);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingTransactions();
      setPendingTransactions(response.transactions);
    } catch (error: any) {
      setError(error.message || 'Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      setProcessingId(transactionId);
      await apiService.approveTransaction(transactionId);
      await loadPendingTransactions(); // Reload the list
    } catch (error: any) {
      setError(error.message || 'Failed to approve transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransaction = async (transactionId: string, reason: string) => {
    try {
      setProcessingId(transactionId);
      await apiService.rejectTransaction(transactionId, reason);
      await loadPendingTransactions(); // Reload the list
    } catch (error: any) {
      setError(error.message || 'Failed to reject transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'REGISTRATION':
        return 'Property Registration';
      case 'SALE':
        return 'Property Sale';
      case 'RENT':
        return 'Property Rental';
      case 'TRANSFER':
        return 'Property Transfer';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve pending property transactions
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {pendingTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No pending transactions</div>
          <p className="text-gray-500 mt-2">
            All transactions have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatTransactionType(transaction.transactionType)}
                    </h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      PENDING REVIEW
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Transaction Amount:</span> ${transaction.amount.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Submitted:</span> {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                    {transaction.from && (
                      <div>
                        <span className="font-medium">Seller:</span> {transaction.from.fullName} ({transaction.from.email})
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Buyer:</span> {transaction.to.fullName} ({transaction.to.email})
                    </div>
                  </div>

                  {transaction.metadata.terms && (
                    <div className="bg-gray-50 rounded-md p-3 mb-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Transaction Terms:</span> {transaction.metadata.terms}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => handleApproveTransaction(transaction.id)}
                    disabled={processingId === transaction.id}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === transaction.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </button>

                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for rejection:');
                      if (reason) {
                        handleRejectTransaction(transaction.id, reason);
                      }
                    }}
                    disabled={processingId === transaction.id}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>

                  <button
                    onClick={() => {
                      // This would open a detailed view modal in a real implementation
                      console.log('View details for transaction:', transaction.id);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;