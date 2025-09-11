import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, MessageCircle, Eye, Heart } from 'lucide-react';
import { Land } from '../types';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const LandMarketplace: React.FC = () => {
  const { auth } = useAuth();
  const [lands, setLands] = useState<Land[]>([]);
  const [filteredLands, setFilteredLands] = useState<Land[]>([]);
  const [myLands, setMyLands] = useState<Land[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-lands'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    district: '',
    state: '',
    landType: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'browse') {
      loadLandsForSale();
    } else {
      loadMyLands();
    }
  }, [activeTab]);

  useEffect(() => {
    filterLands();
  }, [lands, searchTerm, filters]);

  const loadLandsForSale = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLandsForSale({ limit: 100 });
      setLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load lands for sale');
    } finally {
      setLoading(false);
    }
  };

  const loadMyLands = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyLands();
      setMyLands(response.lands);
    } catch (error: any) {
      setError(error.message || 'Failed to load your lands');
    } finally {
      setLoading(false);
    }
  };

  const filterLands = () => {
    const dataToFilter = activeTab === 'browse' ? lands : myLands;
    let filtered = [...dataToFilter];

    if (searchTerm) {
      filtered = filtered.filter(land =>
        land.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(land => 
        (land.marketInfo.askingPrice || 0) >= parseFloat(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(land => 
        (land.marketInfo.askingPrice || 0) <= parseFloat(filters.maxPrice)
      );
    }

    if (filters.district) {
      filtered = filtered.filter(land => 
        land.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }

    if (filters.state) {
      filtered = filtered.filter(land => 
        land.state.toLowerCase().includes(filters.state.toLowerCase())
      );
    }

    if (filters.landType) {
      filtered = filtered.filter(land => land.landType === filters.landType);
    }

    setFilteredLands(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePurchaseLand = async (landId: string) => {
    const offerPrice = prompt('Enter your offer price (₹):');
    if (offerPrice && !isNaN(parseFloat(offerPrice))) {
      try {
        await apiService.purchaseLand(landId, parseFloat(offerPrice));
        alert('Purchase request submitted successfully! Admin will review your request.');
        loadLandsForSale();
      } catch (error: any) {
        setError(error.message || 'Failed to submit purchase request');
      }
    }
  };

  const handleStartChat = async (landId: string) => {
    try {
      const response = await apiService.startChat(landId);
      // Navigate to chat or show success message
      console.log('Chat started:', response.chat.id);
    } catch (error: any) {
      setError(error.message || 'Failed to start chat');
    }
  };

  const handleListForSale = async (landId: string) => {
    const askingPrice = prompt('Enter asking price (₹):');
    const description = prompt('Enter description (optional):');
    
    if (askingPrice) {
      try {
        await apiService.listLandForSale(landId, {
          askingPrice: parseFloat(askingPrice),
          description: description || ''
        });
        loadMyLands();
      } catch (error: any) {
        setError(error.message || 'Failed to list land for sale');
      }
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} L`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };

  const renderLandCard = (land: Land, showChatButton = true) => (
    <div
      key={land.id}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {land.village}, {land.district}
            </h3>
            <p className="text-sm text-gray-600">
              Asset ID: {land.assetId} • Survey: {land.surveyNumber}
            </p>
          </div>
          {land.marketInfo.askingPrice && (
            <div className="text-right">
              <p className="text-xl font-bold text-green-600">
                {formatPrice(land.marketInfo.askingPrice)}
              </p>
              <p className="text-sm text-gray-500">
                ₹{land.marketInfo.pricePerSqft?.toLocaleString()}/sq ft
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {land.taluka}, {land.state} - {land.pincode}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Type: {land.landType}</span>
            <span>Area: {land.area.acres || 0} Acres</span>
          </div>
        </div>

        {land.marketInfo.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {land.marketInfo.description}
          </p>
        )}

        {showChatButton && land.currentOwner && (
          <div className="bg-gray-50 rounded-md p-3 mb-4">
            <p className="text-sm font-medium text-gray-700">
              Owner: {land.currentOwner.fullName}
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
            View Details
          </button>

          {showChatButton && land.currentOwner && land.currentOwner.id !== auth.user?.id && (
            <button
              onClick={() => handlePurchaseLand(land.id)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Purchase Land
            </button>
          )}

          {!showChatButton && !land.marketInfo.isForSale && (
            <button
              onClick={() => handleListForSale(land.id)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              List for Sale
            </button>
          )}
        </div>

        {land.marketInfo.listedDate && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Listed on {new Date(land.marketInfo.listedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Land Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Buy and sell land properties with verified ownership
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'browse'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Browse Lands
          </button>
          <button
            onClick={() => setActiveTab('my-lands')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-lands'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            My Lands
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Asset ID, Village, District..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {activeTab === 'browse' && (
            <>
              <input
                type="number"
                placeholder="Min Price (₹)"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <input
                type="number"
                placeholder="Max Price (₹)"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </>
          )}

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

          <input
            type="text"
            placeholder="District"
            value={filters.district}
            onChange={(e) => handleFilterChange('district', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lands Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredLands.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">
            {activeTab === 'browse' ? 'No lands for sale found' : 'You don\'t own any lands yet'}
          </div>
          <p className="text-gray-500 mt-2">
            {activeTab === 'browse'
              ? 'Try adjusting your search or filter criteria.'
              : 'Claim ownership of lands from the Land Database to see them here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLands.map((land) => renderLandCard(land, activeTab === 'browse'))}
        </div>
      )}
    </div>
  );
};

export default LandMarketplace;