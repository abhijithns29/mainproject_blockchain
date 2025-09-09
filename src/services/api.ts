const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: any) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyWallet(walletData: any) {
    return this.request('/auth/verify-wallet', {
      method: 'POST',
      body: JSON.stringify(walletData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Property endpoints
  async getProperties(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/properties${queryString ? `?${queryString}` : ''}`);
  }

  async getProperty(id: string) {
    return this.request(`/properties/${id}`);
  }

  async registerProperty(propertyData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/properties/register`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: propertyData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Property registration failed');
    }

    return await response.json();
  }

  async listProperty(id: string, listingData: any) {
    return this.request(`/properties/${id}/list`, {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async getUserProperties() {
    return this.request('/properties/user/owned');
  }

  // Transaction endpoints
  async initiateTransaction(transactionData: any) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async getPendingTransactions() {
    return this.request('/transactions/pending');
  }

  async approveTransaction(id: string) {
    return this.request(`/transactions/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectTransaction(id: string, reason: string) {
    return this.request(`/transactions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async getPropertyTransactions(propertyId: string) {
    return this.request(`/transactions/property/${propertyId}`);
  }

  async getUserTransactions() {
    return this.request('/transactions/user/history');
  }

  async verifyCertificate(certificateHash: string) {
    return this.request(`/transactions/verify/${certificateHash}`);
  }

  // User verification endpoints
  async submitVerificationDocuments(formData: FormData) {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/verification/submit`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Document submission failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Document submission error:', error);
      throw error;
    }
  }

  async getPendingVerifications() {
    return this.request('/users/verification/pending');
  }

  async verifyUser(userId: string, verificationData: any) {
    return this.request(`/users/verification/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify(verificationData),
    });
  }

  // Land management endpoints
  async addLand(landData: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/lands/add`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: landData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Land addition failed');
    }

    return await response.json();
  }

  async getLands(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands${queryString ? `?${queryString}` : ''}`);
  }

  async searchLand(assetId: string) {
    return this.request(`/lands/search/${assetId}`);
  }

  async claimLandOwnership(landId: string) {
    return this.request(`/lands/${landId}/claim`, {
      method: 'POST',
    });
  }

  async digitalizeLand(landId: string) {
    return this.request(`/lands/${landId}/digitalize`, {
      method: 'POST',
    });
  }

  async listLandForSale(landId: string, saleData: any) {
    return this.request(`/lands/${landId}/list-for-sale`, {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async getMyLands() {
    return this.request('/lands/my-lands');
  }

  async getLandsForSale(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/lands/for-sale${queryString ? `?${queryString}` : ''}`);
  }

  // Chat endpoints
  async startChat(landId: string) {
    return this.request('/chat/start', {
      method: 'POST',
      body: JSON.stringify({ landId }),
    });
  }

  async getMyChats() {
    return this.request('/chat/my-chats');
  }

  async getChat(chatId: string) {
    return this.request(`/chat/${chatId}`);
  }

  async sendMessage(chatId: string, messageData: any) {
    return this.request(`/chat/${chatId}/message`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async makeOffer(chatId: string, offerAmount: number) {
    return this.request(`/chat/${chatId}/offer`, {
      method: 'POST',
      body: JSON.stringify({ offerAmount }),
    });
  }

  async makeCounterOffer(chatId: string, counterAmount: number) {
    return this.request(`/chat/${chatId}/counter-offer`, {
      method: 'POST',
      body: JSON.stringify({ counterAmount }),
    });
  }

  async acceptOffer(chatId: string) {
    return this.request(`/chat/${chatId}/accept`, {
      method: 'POST',
    });
  }

  // Land transaction endpoints
  async initiateLandTransaction(chatId: string) {
    return this.request('/land-transactions/initiate', {
      method: 'POST',
      body: JSON.stringify({ chatId }),
    });
  }

  async submitTransactionDocuments(transactionId: string, documents: FormData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/land-transactions/${transactionId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: documents,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Document submission failed');
    }

    return await response.json();
  }

  async getPendingLandTransactions() {
    return this.request('/land-transactions/pending-review');
  }

  async reviewLandTransaction(transactionId: string, reviewData: any) {
    return this.request(`/land-transactions/${transactionId}/review`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async getMyLandTransactions() {
    return this.request('/land-transactions/my-transactions');
  }

  async getLandTransaction(transactionId: string) {
    return this.request(`/land-transactions/${transactionId}`);
  }

  async verifyOwnership(transactionId: string) {
    return this.request(`/land-transactions/verify/${transactionId}`);
  }
}

export default new ApiService();