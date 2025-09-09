export interface User {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN';
  profile?: {
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    nationalId?: string;
    profileImage?: string;
  };
  isVerified: boolean;
  ownedProperties: string[];
}

export interface Property {
  id: string;
  blockchainId: number;
  title: string;
  description: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  size: number;
  valuation: number;
  owner: User;
  status: 'AVAILABLE' | 'FOR_SALE' | 'FOR_RENT' | 'SOLD' | 'RENTED';
  documents: Document[];
  images: Document[];
  metadata: {
    propertyType?: string;
    yearBuilt?: number;
    amenities?: string[];
    zoning?: string;
  };
  isVerified: boolean;
  registrationDate: string;
  transactionHistory: string[];
}

export interface Document {
  name: string;
  ipfsHash: string;
  uploadDate: string;
}

export interface Transaction {
  id: string;
  propertyId: string;
  blockchainTransactionId: number;
  from?: User;
  to: User;
  transactionType: 'REGISTRATION' | 'SALE' | 'RENT' | 'TRANSFER';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: User;
  certificateHash?: string;
  certificateUrl?: string;
  blockchainTxHash?: string;
  metadata: {
    description?: string;
    terms?: string;
    duration?: number;
    rejectionReason?: string;
  };
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}