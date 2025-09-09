const { ethers } = require('ethers');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.wallet = null;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.contractABI = [
      "function registerProperty(address _owner, string memory _ipfsHash, string memory _location, uint256 _size, uint256 _valuation) external returns (uint256)",
      "function initiateTransaction(uint256 _propertyId, address _to, uint8 _type, uint256 _amount) external returns (uint256)",
      "function approveTransaction(uint256 _propertyId, uint256 _transactionIndex, string memory _certificateHash) external",
      "function getProperty(uint256 _propertyId) external view returns (tuple(uint256,string,address,string,uint256,uint256,uint8,uint256,bool))",
      "function getPropertyTransactions(uint256 _propertyId) external view returns (tuple(uint256,address,address,uint8,uint256,uint256,bool,string)[])",
      "function getOwnerProperties(address _owner) external view returns (uint256[])",
      "function updatePropertyStatus(uint256 _propertyId, uint8 _status) external",
      "event PropertyRegistered(uint256 indexed propertyId, address indexed owner, string location)",
      "event TransactionInitiated(uint256 indexed transactionId, uint256 indexed propertyId, address indexed from, address to)",
      "event TransactionApproved(uint256 indexed transactionId, uint256 indexed propertyId)"
    ];
  }

  async initialize() {
    try {
      // Connect to Ethereum network (use Sepolia testnet or local network)
      this.provider = new ethers.providers.JsonRpcProvider(
        process.env.RPC_URL || 'http://localhost:8545'
      );

      // Create wallet from private key
      this.wallet = new ethers.Wallet(
        process.env.ADMIN_PRIVATE_KEY || '0x' + '0'.repeat(64),
        this.provider
      );

      // Initialize contract
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.wallet
        );
      }

      console.log('Blockchain service initialized');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  async registerProperty(owner, ipfsHash, location, size, valuation) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.registerProperty(
        owner,
        ipfsHash,
        location,
        ethers.utils.parseUnits(size.toString(), 0),
        ethers.utils.parseEther(valuation.toString())
      );
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error registering property:', error);
      throw error;
    }
  }

  async getProperty(propertyId) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      return await this.contract.getProperty(propertyId);
    } catch (error) {
      console.error('Error getting property:', error);
      throw error;
    }
  }

  async initiateTransaction(propertyId, to, type, amount) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.initiateTransaction(
        propertyId,
        to,
        type,
        ethers.utils.parseEther(amount.toString())
      );
      
      return await tx.wait();
    } catch (error) {
      console.error('Error initiating transaction:', error);
      throw error;
    }
  }

  async approveTransaction(propertyId, transactionIndex, certificateHash) {
    try {
      if (!this.contract) throw new Error('Contract not initialized');
      
      const tx = await this.contract.approveTransaction(
        propertyId,
        transactionIndex,
        certificateHash
      );
      
      return await tx.wait();
    } catch (error) {
      console.error('Error approving transaction:', error);
      throw error;
    }
  }
}

module.exports = new BlockchainService();