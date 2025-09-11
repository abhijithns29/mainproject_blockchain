import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';

const UserVerification: React.FC = () => {
  const { auth } = useAuth();
  const [formData, setFormData] = useState({
    panNumber: '',
    aadhaarNumber: '',
    dlNumber: '',
    passportNumber: ''
  });
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    panCard: null,
    aadhaarCard: null,
    drivingLicense: null,
    passport: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({
        ...files,
        [docType]: e.target.files[0]
      });
    }
  };

  const removeFile = (docType: string) => {
    setFiles({
      ...files,
      [docType]: null
    });
  };

  const canSubmit = () => {
    // Check if at least one document is provided with its number
    const hasValidDoc = (
      (formData.panNumber && files.panCard) ||
      (formData.aadhaarNumber && files.aadhaarCard) ||
      (formData.dlNumber && files.drivingLicense) ||
      (formData.passportNumber && files.passport)
    );
    
    return hasValidDoc && !loading && auth.user?.verificationStatus !== 'PENDING';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit()) {
      setError('Please provide at least one document with its number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      
      // Add document numbers
      if (formData.panNumber && files.panCard) {
        formDataToSend.append('panNumber', formData.panNumber);
        formDataToSend.append('panCard', files.panCard);
      }
      if (formData.aadhaarNumber && files.aadhaarCard) {
        formDataToSend.append('aadhaarNumber', formData.aadhaarNumber);
        formDataToSend.append('aadhaarCard', files.aadhaarCard);
      }
      if (formData.dlNumber && files.drivingLicense) {
        formDataToSend.append('dlNumber', formData.dlNumber);
        formDataToSend.append('drivingLicense', files.drivingLicense);
      }
      if (formData.passportNumber && files.passport) {
        formDataToSend.append('passportNumber', formData.passportNumber);
        formDataToSend.append('passport', files.passport);
      }

      await apiService.submitVerificationDocuments(formDataToSend);
      setSuccess('Verification documents submitted successfully! Please wait for admin approval.');
      
      // Reset form
      setFormData({
        panNumber: '',
        aadhaarNumber: '',
        dlNumber: '',
        passportNumber: ''
      });
      setFiles({
        panCard: null,
        aadhaarCard: null,
        drivingLicense: null,
        passport: null
      });

      // Reload page to update user status
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to submit verification documents');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = () => {
    if (!auth.user) return null;
    
    switch (auth.user.verificationStatus) {
      case 'PENDING':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-yellow-800 font-medium">Verification Pending</span>
            </div>
            <p className="text-yellow-700 mt-1">
              Your documents are under review. You'll be notified once verified.
            </p>
          </div>
        );
      case 'VERIFIED':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-800 font-medium">Account Verified</span>
            </div>
            <p className="text-green-700 mt-1">
              Your account has been verified. You can now claim land ownership and participate in transactions.
            </p>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800 font-medium">Verification Rejected</span>
            </div>
            <p className="text-red-700 mt-1">
              {auth.user.rejectionReason || 'Your verification was rejected. Please contact support or resubmit with correct documents.'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // Don't show verification form for admins
  if (auth.user?.role === 'ADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Administrator account verification status</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-800 font-medium">Administrator Account</span>
          </div>
          <p className="text-blue-700 mt-1">
            Administrator accounts are automatically verified and do not require document submission.
          </p>
        </div>
      </div>
    );
  }

  if (auth.user?.verificationStatus === 'VERIFIED') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Verification</h1>
          <p className="mt-1 text-sm text-gray-500">Your account verification status</p>
        </div>
        {getVerificationStatus()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit your identity documents for verification to access all features
        </p>
      </div>

      {getVerificationStatus()}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Please provide at least one identity document with its number to proceed with verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PAN Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              PAN Card
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ABCDE1234F"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PAN Card
              </label>
              {files.panCard ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-700">{files.panCard.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('panCard')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'panCard')}
                    className="hidden"
                    id="panCard"
                  />
                  <label htmlFor="panCard" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Aadhaar Card */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Aadhaar Card
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhaar Number
              </label>
              <input
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1234 5678 9012"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Aadhaar Card
              </label>
              {files.aadhaarCard ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-700">{files.aadhaarCard.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('aadhaarCard')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'aadhaarCard')}
                    className="hidden"
                    id="aadhaarCard"
                  />
                  <label htmlFor="aadhaarCard" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Driving License */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Driving License (Optional)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Number
              </label>
              <input
                type="text"
                name="dlNumber"
                value={formData.dlNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="DL1420110012345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Driving License
              </label>
              {files.drivingLicense ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-700">{files.drivingLicense.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('drivingLicense')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'drivingLicense')}
                    className="hidden"
                    id="drivingLicense"
                  />
                  <label htmlFor="drivingLicense" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Passport */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Passport (Optional)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                name="passportNumber"
                value={formData.passportNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="A1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Passport
              </label>
              {files.passport ? (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-700">{files.passport.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('passport')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileChange(e, 'passport')}
                    className="hidden"
                    id="passport"
                  />
                  <label htmlFor="passport" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button
            type="submit"
            disabled={!canSubmit()}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              canSubmit()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </div>
            ) : (
              'Submit for Verification'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserVerification;