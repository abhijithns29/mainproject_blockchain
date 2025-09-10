# Blockchain Land Registry System

A comprehensive blockchain-based land registry system that provides secure, transparent, and government-approved property management with real-world features using Ganache, MetaMask, and MongoDB.

## 🏛️ System Overview

This is a production-ready land registry system that combines:
- **Blockchain Technology** (Ganache/Ethereum) for immutable property records
- **Government-Style Admin Portal** for official property registration and transaction approval
- **User Portal** for property owners to manage their assets
- **IPFS Integration** for decentralized document storage
- **Automated Certificate Generation** with blockchain verification
- **Complete Transaction Lifecycle** from initiation to approval

## ✨ Key Features

### 🔐 Authentication & Authorization
- Multi-modal login (Email/Password + MetaMask wallet connection)
- Role-based access control (User vs Admin/Government)
- JWT token-based session management
- Wallet signature verification
- **Admin accounts don't require verification**
- **Regular users must complete verification to claim land ownership**

### 🏠 Property Management
- **Admin-Only Registration**: Only government officials can register new properties
- Complete property metadata storage (location, size, valuation, documents)
- IPFS integration for secure document and image storage
- Blockchain-based ownership tracking
- Property status management (Available, For Sale, For Rent, Sold, Rented)

### 📋 Transaction System
- User-initiated property transactions (sale, rent, transfer requests)
- **Government Approval Required**: All transactions must be approved by admin
- Pending transaction queue for administrative review
- Smart contract execution only after official approval
- Complete audit trail of all property transactions

### 🏞️ Land Database & Digitalization
- Comprehensive land database with survey numbers, boundaries, and ownership history
- **Digital Certificate Generation**: Admins can digitalize land records
- **Asset ID Search**: Users can search lands using Asset ID
- **Land Marketplace**: Users can list verified lands for sale
- **Chat System**: Buyers and sellers can communicate and negotiate

### 📜 Certificate Generation
- Automated PDF certificate generation after successful transactions
- QR codes for blockchain verification
- IPFS storage of certificates for permanent access
- Government-style certificate design with official branding

## 🚀 Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
3. **Ganache** - [Download here](https://trufflesuite.com/ganache/)
4. **MetaMask** browser extension - [Install here](https://metamask.io/)
5. **Git** - [Download here](https://git-scm.com/)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repository-url>
cd blockchain-land-registry
npm install
```

### 2. MongoDB Setup

#### Option A: Local MongoDB
1. Install and start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

2. Create database and admin users:
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Create database
   use landregistry
   
   # Create admin users (run these commands in MongoDB shell)
   db.users.insertMany([
     {
       fullName: "System Administrator",
       email: "admin@landregistry.gov",
       password: "$2b$12$LQv3c1yqBwEHFl5L5KcYKOeB7oEa7tin/nOGNvQQXjrHMrri9Q/Iq", // password: admin123
       walletAddress: "0x742d35Cc6634C0532925a3b8D4C2C4e4C4e4C4e4",
       role: "ADMIN",
       verificationStatus: "VERIFIED",
       isVerified: true,
       ownedProperties: [],
       createdAt: new Date(),
       updatedAt: new Date()
     },
     {
       fullName: "Land Registry Officer",
       email: "officer@landregistry.gov",
       password: "$2b$12$LQv3c1yqBwEHFl5L5KcYKOeB7oEa7tin/nOGNvQQXjrHMrri9Q/Iq", // password: admin123
       walletAddress: "0x8ba1f109551bD432803012645Hac136c22c177ec",
       role: "ADMIN",
       verificationStatus: "VERIFIED",
       isVerified: true,
       ownedProperties: [],
       createdAt: new Date(),
       updatedAt: new Date()
     }
   ])
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Manually add the admin users through Atlas interface or MongoDB Compass

### 3. Ganache Setup

1. **Install and Start Ganache**:
   - Download and install Ganache from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
   - Start Ganache and create a new workspace
   - Note the RPC Server URL (usually `http://127.0.0.1:7545`)
   - Note the Network ID (usually `5777`)

2. **Configure Ganache**:
   - Set Port Number: `7545`
   - Network ID: `5777`
   - Accounts & Keys: Generate at least 10 accounts
   - Copy the first account's private key for admin use

### 4. MetaMask Setup

1. **Install MetaMask** browser extension
2. **Add Ganache Network**:
   - Open MetaMask
   - Click Networks dropdown → Add Network → Add a network manually
   - Fill in the details:
     - **Network Name**: `Ganache Local`
     - **New RPC URL**: `http://127.0.0.1:7545`
     - **Chain ID**: `5777`
     - **Currency Symbol**: `ETH`
     - **Block Explorer URL**: (leave empty)

3. **Import Ganache Account**:
   - In MetaMask: Account menu → Import Account
   - Paste the private key from Ganache
   - This will be your admin account

### 5. Environment Configuration

#### A. Server Environment (.env)

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/landregistry
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/landregistry

# JWT Secret Key (IMPORTANT: Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-production

# Blockchain Configuration (Ganache Local)
RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=  # Will be filled after deployment
ADMIN_PRIVATE_KEY=0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d  # Replace with your Ganache account private key

# IPFS Configuration (Free Options)
IPFS_HOST=ipfs.io
IPFS_PORT=443
IPFS_PROTOCOL=https

# Optional: Web3.Storage (Free 1TB)
# Get your free token at https://web3.storage
# WEB3_STORAGE_TOKEN=your-free-web3-storage-token

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

#### B. Frontend Environment (.env.local)

Create a `.env.local` file in the root directory:

```env
# Contract address (will be set after blockchain setup)
VITE_CONTRACT_ADDRESS=

# RPC URL for frontend (Ganache)
VITE_RPC_URL=http://127.0.0.1:7545

# API URL
VITE_API_URL=http://localhost:5000/api
```

### 6. Smart Contract Deployment

1. **Compile and Deploy Contract**:
   ```bash
   # Compile the smart contract
   npm run blockchain:compile
   
   # Deploy to Ganache
   npm run blockchain:deploy:ganache
   ```

2. **Update Environment Variables**:
   - Copy the contract address from the deployment output
   - Update `CONTRACT_ADDRESS` in `.env`
   - Update `VITE_CONTRACT_ADDRESS` in `.env.local`

### 7. Start the Application

```bash
# Start both backend and frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 👥 Default Admin Accounts

### Admin Account 1
- **Email**: `admin@landregistry.gov`
- **Password**: `admin123`
- **Role**: System Administrator
- **Status**: Pre-verified (no verification required)

### Admin Account 2
- **Email**: `officer@landregistry.gov`
- **Password**: `admin123`
- **Role**: Land Registry Officer
- **Status**: Pre-verified (no verification required)

**Note**: Admin accounts are automatically verified and don't require document verification. Regular users must complete the verification process to claim land ownership.

## 🔧 Usage Guide

### For Regular Users

1. **Registration & Verification**:
   - Create account with email/password or connect MetaMask
   - Submit verification documents (PAN, Aadhaar, etc.)
   - Wait for admin approval

2. **Land Search & Ownership**:
   - Search lands by Asset ID in the Land Database
   - Claim ownership of unassigned lands (requires verification)
   - View your owned properties

3. **Marketplace**:
   - List your verified lands for sale
   - Browse available properties
   - Chat with sellers and negotiate prices

4. **Transactions**:
   - Initiate purchase/rental requests
   - Submit required documents
   - Track transaction status

### For Administrators

1. **Land Management**:
   - Add new lands to the database
   - Digitalize land records (generate certificates)
   - Verify and approve land ownership claims

2. **User Management**:
   - Review user verification documents
   - Approve/reject user verifications
   - Manage user roles and permissions

3. **Transaction Oversight**:
   - Review pending transactions
   - Approve/reject property transfers
   - Generate official certificates

## 🔍 Key Features Explained

### Asset ID Search
- Each land has a unique Asset ID (e.g., `KA001123456`)
- Users can search for specific lands using this ID
- Asset IDs are automatically generated based on state and district codes

### Digital Certificates
- Admins can digitalize land records to create official certificates
- Certificates include QR codes for blockchain verification
- All certificates are stored on IPFS for permanent access

### Chat & Negotiation System
- Buyers can start conversations with land sellers
- Built-in offer/counter-offer system
- Deal agreements trigger official transaction processes

### Verification System
- Regular users must submit identity documents
- Admins review and approve verifications
- Only verified users can claim land ownership

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Start only backend
npm run server:dev

# Start only frontend
npm run client:dev

# Compile smart contracts
npm run blockchain:compile

# Deploy to Ganache
npm run blockchain:deploy:ganache

# Build for production
npm run build

# Run linting
npm run lint
```

## 🔧 Troubleshooting

### Common Issues

1. **"Contract not found"**
   - Ensure Ganache is running
   - Verify CONTRACT_ADDRESS is set correctly in both .env files
   - Redeploy contract if needed

2. **"Database connection failed"**
   - Check MongoDB is running: `mongosh --eval "db.adminCommand('ismaster')"`
   - Verify MONGODB_URI is correct
   - Check network connectivity for Atlas

3. **"MetaMask connection failed"**
   - Ensure MetaMask is installed and unlocked
   - Check Ganache network is added correctly
   - Verify account has ETH for gas fees

4. **"Admin login not working"**
   - Ensure admin users are created in MongoDB
   - Check password hash is correct
   - Verify email addresses match exactly

5. **"Port already in use"**
   - Change PORT in `.env`
   - Kill existing processes: `pkill -f node`

### Reset Everything

```bash
# Stop all processes
pkill -f node

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart Ganache and redeploy
npm run blockchain:deploy:ganache

# Update environment variables with new contract address
# Restart application
npm run dev
```

## 📊 Database Schema

### Users Collection
- Basic user information and authentication
- Verification documents and status
- Role-based permissions (USER/ADMIN)
- Owned properties references

### Lands Collection
- Complete land records with survey details
- Ownership history and boundaries
- Digital certificates and QR codes
- Market information for sales

### Chats Collection
- Buyer-seller communications
- Offer/counter-offer negotiations
- Deal agreements and status

### Transactions Collection
- Property transfer records
- Admin approvals and certificates
- Blockchain transaction hashes

## 🔐 Security Features

- **Role-Based Access Control**: Strict separation of user and admin capabilities
- **Blockchain Immutability**: All ownership records permanently stored
- **Government Approval**: No transaction executes without official approval
- **Document Verification**: Identity verification required for land claims
- **IPFS Integrity**: Document hashes verify file integrity
- **Audit Trail**: Complete history of all property transactions

## 🚀 Production Deployment

For production deployment:

1. **Database**: Use MongoDB Atlas or dedicated MongoDB server
2. **Blockchain**: Deploy to Ethereum mainnet or testnet
3. **Storage**: Use Web3.Storage (free) or dedicated IPFS node
4. **Frontend**: Deploy to Vercel, Netlify, or similar
5. **Backend**: Deploy to AWS, Google Cloud, or similar
6. **Security**: Update JWT_SECRET, use HTTPS, configure CORS properly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check this README for setup instructions
- Review the troubleshooting section
- Create an issue in the repository
- Contact the development team

---

**Note**: This system is designed for real-world government land registry use cases. Ensure proper security audits and compliance checks before deployment in production environments.