import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MapPin,
  Home,
  Plus,
  Eye,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Land } from "../types";
import { useAuth } from "../hooks/useAuth";
import apiService from "../services/api";
import AddLandForm from "./AddLandForm";

const LandDatabase: React.FC = () => {
  const { auth } = useAuth();
  const [lands, setLands] = useState<Land[]>([]);
  const [filteredLands, setFilteredLands] = useState<Land[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    district: "",
    state: "",
    landType: "",
    status: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLand, setSelectedLand] = useState<Land | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      setError(error.message || "Failed to load lands");
    } finally {
      setLoading(false);
    }
  };

  const filterLands = () => {
    let filtered = [...lands];

    if (searchTerm) {
      filtered = filtered.filter(
        (land) =>
          land.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          land.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
          land.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
          land.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((land) =>
          (land as any)[key]?.toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    setFilteredLands(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClaimOwnership = async (landId: string) => {
    try {
      if (auth.user?.verificationStatus !== "VERIFIED") {
        setError(
          "You must be verified to claim land ownership. Please complete your verification first."
        );
        return;
      }

      await apiService.claimLandOwnership(landId);
      loadLands();
    } catch (error: any) {
      setError(error.message || "Failed to claim ownership");
    }
  };

  const handleDigitalize = async (landId: string) => {
    try {
      await apiService.digitalizeLand(landId);
      loadLands();
    } catch (error: any) {
      setError(error.message || "Failed to digitalize land");
    }
  };

  const handleListForSale = async (landId: string, saleData: any) => {
    try {
      await apiService.listLandForSale(landId, saleData);
      loadLands();
    } catch (error: any) {
      setError(error.message || "Failed to list land for sale");
    }
  };

  const handleSearchById = async (assetId: string) => {
    try {
      setLoading(true);
      const response = await apiService.searchLand(assetId);
      setLands([response.land]);
      setFilteredLands([response.land]);
    } catch (error: any) {
      setError(error.message || "Land not found");
      setLands([]);
      setFilteredLands([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "FOR_SALE":
        return "bg-blue-100 text-blue-800";
      case "UNDER_TRANSACTION":
        return "bg-yellow-100 text-yellow-800";
      case "SOLD":
        return "bg-gray-100 text-gray-800";
      case "DISPUTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        {auth.user?.role === "ADMIN" && (
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
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-800 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Asset ID Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search by Asset ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter Asset ID (e.g., KA001123456)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  const target = e.target as HTMLInputElement;
                  if (target.value.trim()) {
                    handleSearchById(target.value.trim());
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector(
                  'input[placeholder*="Asset ID"]'
                ) as HTMLInputElement;
                if (input?.value.trim()) {
                  handleSearchById(input.value.trim());
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => {
                const input = document.querySelector(
                  'input[placeholder*="Asset ID"]'
                ) as HTMLInputElement;
                if (input) input.value = "";
                setSearchTerm("");
                setFilters({
                  district: "",
                  state: "",
                  landType: "",
                  status: "",
                });
                loadLands();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Village, District, Survey Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={filters.state}
            onChange={(e) => handleFilterChange("state", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All States</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Rajasthan">Rajasthan</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
          </select>

          <select
            value={filters.landType}
            onChange={(e) => handleFilterChange("landType", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="GOVERNMENT">Government</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="FOR_SALE">For Sale</option>
            <option value="UNDER_TRANSACTION">Under Transaction</option>
            <option value="SOLD">Sold</option>
            <option value="DISPUTED">Disputed</option>
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
              ? "No lands have been added to the database yet."
              : "Try adjusting your search or filter criteria."}
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
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        land.status
                      )}`}
                    >
                      {land.status.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationColor(
                        land.verificationStatus
                      )}`}
                    >
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
                    {auth.user?.verificationStatus !== "VERIFIED" && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Complete verification to claim ownership
                      </p>
                    )}
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
                      setSelectedLand(land);
                      setShowModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>

                  {!land.currentOwner &&
                    auth.user?.verificationStatus === "VERIFIED" && (
                      <button
                        onClick={() => handleClaimOwnership(land.id)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        Claim
                      </button>
                    )}

                  {land.currentOwner?.id === auth.user?.id &&
                    !land.marketInfo.isForSale && (
                      <button
                        onClick={() => {
                          const askingPrice = prompt("Enter asking price (₹):");
                          const description = prompt(
                            "Enter description (optional):"
                          );

                          if (askingPrice) {
                            handleListForSale(land.id, {
                              askingPrice: parseFloat(askingPrice),
                              description: description || "",
                            });
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        List for Sale
                      </button>
                    )}

                  {auth.user?.role === "ADMIN" &&
                    !land.digitalDocument.isDigitalized && (
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
      {showModal && selectedLand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-1/2 max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4">
              Land Details: {selectedLand.assetId}
            </h2>

            <div className="space-y-2">
              <p>
                <strong>Survey Number:</strong> {selectedLand.surveyNumber}
              </p>
              <p>
                <strong>Village:</strong> {selectedLand.village}
              </p>
              <p>
                <strong>Taluka:</strong> {selectedLand.taluka}
              </p>
              <p>
                <strong>District:</strong> {selectedLand.district}
              </p>
              <p>
                <strong>State:</strong> {selectedLand.state}
              </p>
              <p>
                <strong>Land Type:</strong> {selectedLand.landType}
              </p>
              <p>
                <strong>Area:</strong> {selectedLand.area.acres || 0} Acres
              </p>
              <p>
                <strong>Status:</strong> {selectedLand.status}
              </p>
              <p>
                <strong>Verification Status:</strong>{" "}
                {selectedLand.verificationStatus}
              </p>

              {selectedLand.currentOwner ? (
                <>
                  <p>
                    <strong>Owner:</strong> {selectedLand.currentOwner.fullName}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedLand.currentOwner.email}
                  </p>
                </>
              ) : (
                <p>No current owner assigned</p>
              )}

              {selectedLand.marketInfo.isForSale && (
                <p>
                  <strong>Asking Price:</strong> ₹
                  {selectedLand.marketInfo.askingPrice?.toLocaleString()}
                </p>
              )}

              {selectedLand.digitalDocument.isDigitalized && (
                <p>
                  <a
                    href={selectedLand.digitalDocument.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Download Digital Certificate
                  </a>
                </p>
              )}
            </div>
          </div>
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
