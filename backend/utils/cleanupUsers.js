const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const cleanupUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Remove studentProfile field from all users
    const result = await mongoose.connection.db.collection('users').updateMany(
      {},
      { $unset: { studentProfile: "" } }
    );

    console.log(`✓ Updated ${result.modifiedCount} users`);
    console.log('✓ Cleanup complete');

    process.exit(0);
  } catch (error) {
    console.error('✗ Cleanup error:', error);
    process.exit(1);
  }
};

cleanupUsers();
