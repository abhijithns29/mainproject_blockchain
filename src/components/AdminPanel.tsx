import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Users, Database, FileText } from 'lucide-react';
import { Transaction, User, Land } from '../types';
import apiService from '../services/api';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'users' | 'lands'>('transactions');
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allLands, setAllLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadPendingTransactions();
    } else if (activeTab === 'users') {
      loadPendingUsers();
    } else if (activeTab === 'lands') {
      loadAllLands();
    }
  }, [activeTab]);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getPendingTransactions();
      setPendingTransactions(response.transactions);
    } catch (error: any) {
      setError(error.message || 'Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getPendingVerifications();
      setPendingUsers(response.users);
    } catch (error: any) {
      setError(error.message || 'Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const loadAllLands = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getLands({ limit: 100 });
      setAllLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load lands');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      setError('');
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
      setError('');
      setProcessingId(transactionId);
      await apiService.rejectTransaction(transactionId, reason);
      await loadPendingTransactions(); // Reload the list
    } catch (error: any) {
      setError(error.message || 'Failed to reject transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyUser = async (userId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      setError('');
      setProcessingId(userId);
      await apiService.verifyUser(userId, {
        status,
        rejectionReason,
        verifiedDocuments: {
          panCard: true,
          aadhaarCard: true,
          drivingLicense: true,
          passport: true
        }
      });
      await loadPendingUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to verify user');
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

  const renderTransactions = () => (
    <div className="space-y-4">
      {pendingTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No pending transactions</div>
          <p className="text-gray-500 mt-2">All transactions have been processed.</p>
        </div>
      ) : (
        pendingTransactions.map((transaction) => (
          <div key={transaction.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      {pendingUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No pending user verifications</div>
          <p className="text-gray-500 mt-2">All users have been processed.</p>
        </div>
      ) : (
        pendingUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">{user.fullName}</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    PENDING VERIFICATION
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                  <div>
                    <span className="font-medium">Wallet:</span> {user.walletAddress.substring(0, 10)}...
                  </div>
                </div>

                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Submitted Documents:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {user.verificationDocuments?.panCard && (
                      <div>✓ PAN Card: {user.verificationDocuments.panCard.number}</div>
                    )}
                    {user.verificationDocuments?.aadhaarCard && (
                      <div>✓ Aadhaar: {user.verificationDocuments.aadhaarCard.number}</div>
                    )}
                    {user.verificationDocuments?.drivingLicense && (
                      <div>✓ DL: {user.verificationDocuments.drivingLicense.number}</div>
                    )}
                    {user.verificationDocuments?.passport && (
                      <div>✓ Passport: {user.verificationDocuments.passport.number}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleVerifyUser(user.id, 'VERIFIED')}
                  disabled={processingId === user.id}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingId === user.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Please provide a reason for rejection:');
                    if (reason) {
                      handleVerifyUser(user.id, 'REJECTED', reason);
                    }
                  }}
                  disabled={processingId === user.id}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderLands = () => (
    <div className="space-y-4">
      {allLands.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-gray-400 text-lg mt-4">No lands registered</div>
          <p className="text-gray-500 mt-2">No lands have been added to the database yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allLands.map((land) => (
            <div key={land.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Asset ID: {land.assetId}
                  </h3>
                  <p className="text-sm text-gray-600">Survey: {land.surveyNumber}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  land.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                  land.status === 'FOR_SALE' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {land.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div>Location: {land.village}, {land.district}</div>
                <div>Type: {land.landType}</div>
                <div>Area: {land.area.acres || 0} Acres</div>
                {land.currentOwner && (
                  <div>Owner: {land.currentOwner.fullName}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage users, transactions, and land registry
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Pending Transactions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            User Verifications
          </button>
          <button
            onClick={() => setActiveTab('lands')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'lands'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="inline h-4 w-4 mr-2" />
            All Lands
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'lands' && renderLands()}
        </>
      )}
    </div>
  );
};

export default AdminPanel;