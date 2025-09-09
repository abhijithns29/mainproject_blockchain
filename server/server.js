const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const blockchainService = require('./config/blockchain');
const ipfsService = require('./config/ipfs');

// Load environment variables
dotenv.config();

// Initialize services
const initializeServices = async () => {
  await connectDB();
  await blockchainService.initialize();
  await ipfsService.initialize();
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (for development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/transactions', require('./routes/transactions'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Land Registry API is running', timestamp: new Date() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 Land Registry Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();