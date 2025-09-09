import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Home, Plus, Eye, CheckCircle, Clock } from 'lucide-react';
import { Land } from '../types';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import AddLandForm from './AddLandForm';

const LandDatabase: React.FC = () => {
  const { auth } = useAuth();
  const [lands, setLands] = useState<Land[]>([]);
  const [filteredLands, setFilteredLands] = useState<Land[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    district: '',
    state: '',
    landType: '',
    status: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadLands();
  }, []);

  useEffect(() => {
    filterLands();
  }, [lands, searchTerm, filters]);

  const loadLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLands({ limit: 100 });
      setLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load lands');
    } finally {
      setLoading(false);
    }
  };

  const filterLands = () => {
    let filtered = [...lands];

    if (searchTerm) {
      filtered = filtered.filter(land =>
        land.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(land => 
          (land as any)[key]?.toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredLands(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClaimOwnership = async (landId: string) => {
    try {
      await apiService.claimLandOwnership(landId);
      loadLands();
    } catch (error: any) {
      setError(error.message || 'Failed to claim ownership');
    }
  };

  const handleDigitalize = async (landId: string) => {
    try {
      await apiService.digitalizeLand(landId);
      loadLands();
    } catch (error: any) {
      setError(error.message || 'Failed to digitalize land');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800';
      case 'FOR_SALE': return 'bg-blue-100 text-blue-800';
      case 'UNDER_TRANSACTION': return 'bg-yellow-100 text-yellow-800';
      case 'SOLD': return 'bg-gray-100 text-gray-800';
      case 'DISPUTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Land Database</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive database of all registered lands
          </p>
        </div>
        {auth.user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Land
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Asset ID, Village, District, Survey Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All States</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Gujarat">Gujarat</option>
          </select>

          <select
            value={filters.landType}
            onChange={(e) => handleFilterChange('landType', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="INDUSTRIAL">Industrial</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="FOR_SALE">For Sale</option>
            <option value="UNDER_TRANSACTION">Under Transaction</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
      </div>

      {/* Lands Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredLands.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No lands found</div>
          <p className="text-gray-500 mt-2">
            {lands.length === 0
              ? 'No lands have been added to the database yet.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLands.map((land) => (
            <div
              key={land.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Asset ID: {land.assetId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Survey No: {land.surveyNumber}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(land.status)}`}>
                      {land.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationColor(land.verificationStatus)}`}>
                      {land.verificationStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {land.village}, {land.taluka}, {land.district}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Home className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {land.landType} • {land.area.acres || 0} Acres
                    </span>
                  </div>
                </div>

                {land.currentOwner ? (
                  <div className="bg-gray-50 rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700">
                      Owner: {land.currentOwner.fullName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {land.currentOwner.email}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-yellow-800">
                      No current owner assigned
                    </p>
                  </div>
                )}

                {land.marketInfo.isForSale && (
                  <div className="bg-blue-50 rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-blue-800">
                      For Sale: ₹{land.marketInfo.askingPrice?.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // View details functionality
                      console.log('View land details:', land.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>

                  {!land.currentOwner && auth.user?.verificationStatus === 'VERIFIED' && (
                    <button
                      onClick={() => handleClaimOwnership(land.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      Claim
                    </button>
                  )}

                  {auth.user?.role === 'ADMIN' && !land.digitalDocument.isDigitalized && (
                    <button
                      onClick={() => handleDigitalize(land.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Digitalize
                    </button>
                  )}
                </div>

                {land.digitalDocument.isDigitalized && (
                  <div className="mt-3 flex items-center justify-center">
                    <a
                      href={land.digitalDocument.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Download Digital Certificate
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddLandForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadLands();
          }}
        />
      )}
    </div>
  );
};

export default LandDatabase;