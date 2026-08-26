const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dropScheduleIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'NOT FOUND');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('classspaces');

    // Get all indexes
    const indexes = await collection. indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the schedule_1 unique index
    try {
      await collection.dropIndex('schedule_1');
      console.log('✅ Successfully dropped schedule_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️ Index schedule_1 does not exist (already dropped or never existed)');
      } else {
        throw error;
      }
    }

    // Verify indexes after drop
    const newIndexes = await collection.indexes();
    console.log('\nIndexes after drop:', JSON.stringify(newIndexes, null, 2));

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

dropScheduleIndex();
