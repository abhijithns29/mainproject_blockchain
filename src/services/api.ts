const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
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
}

export default new ApiService();