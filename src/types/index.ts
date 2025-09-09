export interface User {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: 'USER' | 'ADMIN';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationDocuments?: {
    panCard?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    aadhaarCard?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    drivingLicense?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
    passport?: {
      number: string;
      documentUrl: string;
      verified: boolean;
    };
  };
  verifiedBy?: string;
  verificationDate?: string;
  rejectionReason?: string;
  isVerified?: boolean;
  profile?: {
    phoneNumber?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    profileImage?: string;
  };
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

export interface Land {
  id: string;
  assetId: string;
  surveyNumber: string;
  subDivision?: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  area: {
    acres?: number;
    guntas?: number;
    sqft?: number;
  };
  boundaries: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  landType: 'AGRICULTURAL' | 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'GOVERNMENT';
  classification?: 'DRY' | 'WET' | 'GARDEN' | 'INAM' | 'SARKAR';
  currentOwner?: User;
  ownershipHistory: Array<{
    owner?: User;
    ownerName?: string;
    fromDate: string;
    toDate?: string;
    documentReference: string;
  }>;
  originalDocuments: Array<{
    type: string;
    documentNumber: string;
    date: string;
    registrationOffice?: string;
    documentUrl: string;
    ipfsHash: string;
  }>;
  digitalDocument: {
    qrCode?: string;
    certificateUrl?: string;
    ipfsHash?: string;
    generatedDate?: string;
    isDigitalized: boolean;
  };
  marketInfo: {
    isForSale: boolean;
    askingPrice?: number;
    pricePerSqft?: number;
    listedDate?: string;
    description?: string;
    images?: string[];
  };
  status: 'AVAILABLE' | 'FOR_SALE' | 'UNDER_TRANSACTION' | 'SOLD' | 'DISPUTED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: User;
  addedBy: User;
  createdAt: string;
}

export interface Chat {
  id: string;
  landId: Land;
  buyer: User;
  seller: User;
  messages: Array<{
    sender: User;
    message: string;
    messageType: 'TEXT' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPTANCE' | 'REJECTION';
    offerAmount?: number;
    timestamp: string;
    isRead: boolean;
  }>;
  currentOffer?: {
    amount: number;
    offeredBy: User;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFERED';
  };
  status: 'ACTIVE' | 'DEAL_AGREED' | 'COMPLETED' | 'CANCELLED';
  agreedPrice?: number;
  agreedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandTransaction extends Transaction {
  landId: Land;
  chatId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}