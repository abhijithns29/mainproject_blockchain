const { create } = require('ipfs-http-client');

class IPFSService {
  constructor() {
    this.client = null;
  }

  async initialize() {
    try {
      // Connect to IPFS node (you can use Infura IPFS or local node)
      this.client = create({
        host: process.env.IPFS_HOST || 'ipfs.infura.io',
        port: process.env.IPFS_PORT || 5001,
        protocol: process.env.IPFS_PROTOCOL || 'https',
        headers: process.env.INFURA_PROJECT_ID ? {
          authorization: `Basic ${Buffer.from(
            `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`
          ).toString('base64')}`
        } : {}
      });

      console.log('IPFS service initialized');
    } catch (error) {
      console.error('Failed to initialize IPFS service:', error);
    }
  }

  async uploadFile(fileBuffer, fileName) {
    try {
      if (!this.client) throw new Error('IPFS client not initialized');

      const result = await this.client.add({
        path: fileName,
        content: fileBuffer
      });

      return result.cid.toString();
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  async uploadJSON(jsonData) {
    try {
      if (!this.client) throw new Error('IPFS client not initialized');

      const result = await this.client.add(JSON.stringify(jsonData));
      return result.cid.toString();
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  getFileUrl(hash) {
    return `https://ipfs.io/ipfs/${hash}`;
  }
}

module.exports = new IPFSService();