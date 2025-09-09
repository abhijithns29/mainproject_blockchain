const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
  constructor() {
    this.gatewayUrl = 'https://ipfs.io/ipfs/';
    this.uploadUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS'; // Free tier available
    this.jsonUploadUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    // Using a free public IPFS node for uploads
    this.publicUploadUrl = 'https://api.web3.storage/upload'; // Free service
  }

  async initialize() {
    try {
      // Using free public IPFS - no initialization needed
      console.log('Free IPFS service initialized');
    } catch (error) {
      console.error('Failed to initialize IPFS service:', error);
    }
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      // Using a simple approach with a free IPFS service
      // For production, you might want to use Web3.Storage or similar free services
      
      // Simulate IPFS upload by creating a hash-like identifier
      // In a real implementation, you would use a free service like Web3.Storage
      const hash = this.generateHash(fileBuffer, fileName);
      
      // Store file locally for demo purposes (in production, use actual IPFS)
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, hash), fileBuffer);
      
      return hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  async uploadJSON(jsonData) {
    try {
      const jsonString = JSON.stringify(jsonData);
      const buffer = Buffer.from(jsonString);
      const hash = this.generateHash(buffer, 'metadata.json');
      
      // Store JSON locally for demo purposes
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadsDir, hash), jsonString);
      
      return hash;
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  generateHash(buffer, fileName) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    hash.update(fileName);
    hash.update(Date.now().toString());
    return 'Qm' + hash.digest('hex').substring(0, 44); // IPFS-like hash format
  }

  getFileUrl(hash) {
    // For local development, serve from local uploads
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:${process.env.PORT || 5000}/uploads/${hash}`;
    }
    // For production, you would use actual IPFS gateway
    return `${this.gatewayUrl}${hash}`;
  }
}

module.exports = new IPFSService();