# Blockchain Land Registry System

A comprehensive blockchain-based land registry system that provides secure, transparent, and government-approved property management with real-world features.

## 🏛️ System Overview

This is a production-ready land registry system that combines:
- **Blockchain Technology** (Ethereum/Solidity) for immutable property records
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

### 📜 Certificate Generation
- Automated PDF certificate generation after successful transactions
- QR codes for blockchain verification
- IPFS storage of certificates for permanent access
- Government-style certificate design with official branding

### 🔗 Blockchain Integration
- Ethereum smart contracts for property ownership
- Immutable transaction records
- Event logging for transparency
- Gas-optimized contract design

## 🏗️ Technical Architecture

### Frontend (React + TypeScript)
- Modern responsive design with Tailwind CSS
- MetaMask integration for blockchain interactions
- Real-time transaction status updates
- Comprehensive admin dashboard
- Mobile-responsive design

### Backend (Node.js + Express)
- RESTful API architecture
- MongoDB for off-chain data storage
- JWT-based authentication
- File upload handling with Multer
- IPFS integration for document storage

### Blockchain Layer
- Solidity smart contracts
- Event-driven architecture
- Role-based access control on-chain
- Gas-optimized operations

### Storage Systems
- **MongoDB**: User accounts, property metadata, transaction records
- **IPFS**: Documents, images, certificates
- **Blockchain**: Ownership records, transaction approvals

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB instance
- Ethereum development environment (Hardhat/Truffle)
- MetaMask browser extension
- IPFS node or Infura IPFS access

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd blockchain-land-registry
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   - Start MongoDB service
   - Create database: `landregistry`

4. **Blockchain Setup**
   - Deploy the LandRegistry smart contract to your chosen network
   - Update CONTRACT_ADDRESS in .env

5. **Start Development**
   ```bash
   npm run dev
   ```

### Production Deployment

For production deployment:

1. **Database**: Use MongoDB Atlas or dedicated MongoDB server
2. **Blockchain**: Deploy to mainnet or testnet (Sepolia recommended for testing)
3. **IPFS**: Use Infura IPFS or dedicated IPFS node
4. **Frontend**: Deploy to Vercel, Netlify, or similar
5. **Backend**: Deploy to AWS, Google Cloud, or similar

## 🔧 Configuration Options

### Environment Variables
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `RPC_URL`: Ethereum RPC endpoint
- `CONTRACT_ADDRESS`: Deployed smart contract address
- `INFURA_PROJECT_ID`: Infura IPFS project ID
- `ADMIN_PRIVATE_KEY`: Admin wallet private key

### Smart Contract Configuration
- Modify contract parameters in `contracts/LandRegistry.sol`
- Update ABI in `src/services/blockchain.ts` after redeployment

## 👥 User Roles

### Regular Users
- Register and login with email or MetaMask
- View all properties in the system
- Initiate transaction requests for properties
- View their transaction history
- Manage personal profile information

### Administrators (Government Officials)
- All user capabilities
- Register new properties into the system
- Review and approve/reject pending transactions
- Generate and issue official certificates
- Full system oversight and management

## 🔄 Transaction Flow

1. **Property Registration** (Admin Only)
   - Admin uploads property documents and metadata
   - System stores documents on IPFS
   - Smart contract records property on blockchain
   - Property becomes available for transactions

2. **Transaction Initiation** (Users)
   - User finds property they want to buy/rent
   - User submits transaction request with terms
   - Transaction enters pending state

3. **Administrative Review** (Admin)
   - Admin reviews transaction details
   - Admin verifies user credentials and terms
   - Admin approves or rejects transaction

4. **Blockchain Execution** (System)
   - Smart contract updates ownership/rental rights
   - PDF certificate generated automatically
   - Certificate uploaded to IPFS
   - All parties notified of completion

## 📊 Database Schema

### Key Collections
- **Users**: Account information, wallet addresses, roles
- **Properties**: Property metadata, documents, current status
- **Transactions**: Transaction records, approval status, certificates

## 🔐 Security Features

- **Role-Based Access Control**: Strict separation of user and admin capabilities
- **Blockchain Immutability**: All ownership records permanently stored
- **Government Approval**: No transaction executes without official approval
- **Encrypted Storage**: Sensitive data encrypted in database
- **IPFS Integrity**: Document hashes verify file integrity
- **Audit Trail**: Complete history of all property transactions

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-wallet` - MetaMask verification

### Property Endpoints
- `GET /api/properties` - List all properties
- `POST /api/properties/register` - Register property (Admin)
- `GET /api/properties/:id` - Get property details

### Transaction Endpoints
- `POST /api/transactions` - Initiate transaction
- `GET /api/transactions/pending` - Pending transactions (Admin)
- `PUT /api/transactions/:id/approve` - Approve transaction (Admin)

## 🎨 Design Philosophy

The system follows government-grade design principles:
- **Professional appearance** suitable for official use
- **Clear information hierarchy** for easy navigation
- **Accessibility compliance** for all users
- **Mobile-responsive design** for field use
- **High contrast** for readability
- **Consistent branding** throughout the application

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Review the documentation
- Check the FAQ section

---

**Note**: This is a production-ready system designed for real-world government land registry use cases. Ensure proper security audits and compliance checks before deployment in production environments.