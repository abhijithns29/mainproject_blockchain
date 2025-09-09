import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Property } from '../types';
import Navbar from './Navbar';
import PropertyCard from './PropertyCard';
import PropertyForm from './PropertyForm';
import TransactionHistory from './TransactionHistory';
import AdminPanel from './AdminPanel';
import UserProfile from './UserProfile';
import UserVerification from './UserVerification';
import LandDatabase from './LandDatabase';
import LandMarketplace from './LandMarketplace';
import ChatSystem from './ChatSystem';
import apiService from '../services/api';

const Dashboard: React.FC = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'properties') {
      loadProperties();
    }
  }, [activeTab]);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, statusFilter]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProperties({
        page: 1,
        limit: 50,
      });
      setProperties(response.properties);
    } catch (error: any) {
      setError(error.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filterProperties = () => {
    let filtered = [...properties];

    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((property) => property.status === statusFilter);
    }

    setFilteredProperties(filtered);
  };

  const handlePropertyRegistered = () => {
    setShowPropertyForm(false);
    loadProperties();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'properties':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage and view all registered properties
                </p>
              </div>
              {auth.user?.role === 'ADMIN' && (
                <button
                  onClick={() => setShowPropertyForm(true)}
                  className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Register Property
                </button>
              )}
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search properties by title, city, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="FOR_SALE">For Sale</option>
                  <option value="FOR_RENT">For Rent</option>
                  <option value="SOLD">Sold</option>
                  <option value="RENTED">Rented</option>
                </select>
              </div>
            </div>

            {/* Properties Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No properties found</div>
                <p className="text-gray-500 mt-2">
                  {properties.length === 0
                    ? 'No properties have been registered yet.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => {
                      // Handle property click - could open detailed view
                      console.log('Property clicked:', property.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'transactions':
        return <TransactionHistory />;

      case 'profile':
        return <UserProfile />;

      case 'admin':
        return auth.user?.role === 'ADMIN' ? <AdminPanel /> : null;

      case 'verification':
        return <UserVerification />;

      case 'land-database':
        return <LandDatabase />;

      case 'marketplace':
        return <LandMarketplace />;

      case 'chats':
        return <ChatSystem />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>

      {showPropertyForm && (
        <PropertyForm
          onClose={() => setShowPropertyForm(false)}
          onSuccess={handlePropertyRegistered}
        />
      )}
    </div>
  );
};

export default Dashboard;