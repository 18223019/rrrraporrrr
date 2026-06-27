/**
 * Test Firebase Connection & Configuration
 * Jalankan: node scripts/testFirebase.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebaseServiceAccount.json';

async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase Connection...\n');
  
  try {
    // Load service account
    console.log('1️⃣ Loading service account...');
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    console.log(`   ✅ Service account loaded`);
    console.log(`   📧 Email: ${serviceAccount.client_email}`);
    console.log(`   🆔 Project: ${serviceAccount.project_id}\n`);
    
    // Initialize Firebase Admin
    console.log('2️⃣ Initializing Firebase Admin SDK...');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log('   ✅ Firebase Admin initialized\n');
    
    // Test Auth
    console.log('3️⃣ Testing Firebase Auth...');
    const auth = admin.auth();
    const users = await auth.listUsers(5);
    console.log(`   ✅ Auth accessible`);
    console.log(`   👥 Total users in project: ${users.users.length} (showing max 5)\n`);
    
    if (users.users.length > 0) {
      console.log('   📋 Sample users:');
      users.users.forEach(user => {
        console.log(`      - ${user.uid} (${user.email})`);
      });
    } else {
      console.log('   ⚠️  No users found. Run sync-accounts script to create users.');
    }
    
    console.log('\n✅ All tests passed!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Run: npm run sync-accounts');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test login di browser\n');
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('💡 Tips:');
      console.error('   - Pastikan firebaseServiceAccount.json ada di root folder');
      console.error('   - Download dari: Firebase Console > Project Settings > Service Accounts\n');
    }
    
    process.exit(1);
  }
}

testFirebaseConnection();
