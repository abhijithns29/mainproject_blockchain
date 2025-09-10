const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified for seeding)
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  walletAddress: String,
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  isVerified: { type: Boolean, default: false },
  ownedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedAdminUsers() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/landregistry";
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Check if admin users already exist
    const existingAdmin1 = await User.findOne({ email: 'admin@landregistry.gov' });
    const existingAdmin2 = await User.findOne({ email: 'officer@landregistry.gov' });

    if (existingAdmin1 && existingAdmin2) {
      console.log('Admin users already exist');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin users
    const adminUsers = [
      {
        fullName: "System Administrator",
        email: "admin@landregistry.gov",
        password: hashedPassword,
        walletAddress: "0x742d35Cc6634C0532925a3b8D4C2C4e4C4e4C4e4",
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        isVerified: true,
        ownedProperties: []
      },
      {
        fullName: "Land Registry Officer",
        email: "officer@landregistry.gov",
        password: hashedPassword,
        walletAddress: "0x8ba1f109551bD432803012645Hac136c22c177ec",
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        isVerified: true,
        ownedProperties: []
      }
    ];

    // Insert admin users
    if (!existingAdmin1) {
      await User.create(adminUsers[0]);
      console.log('Created admin user: admin@landregistry.gov');
    }

    if (!existingAdmin2) {
      await User.create(adminUsers[1]);
      console.log('Created admin user: officer@landregistry.gov');
    }

    console.log('\n=== Admin Users Created Successfully ===');
    console.log('Admin Account 1:');
    console.log('  Email: admin@landregistry.gov');
    console.log('  Password: admin123');
    console.log('  Role: System Administrator');
    console.log('\nAdmin Account 2:');
    console.log('  Email: officer@landregistry.gov');
    console.log('  Password: admin123');
    console.log('  Role: Land Registry Officer');
    console.log('\nNote: Admin accounts are pre-verified and do not require document verification.');

  } catch (error) {
    console.error('Error seeding admin users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedAdminUsers();