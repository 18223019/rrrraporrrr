/**
 * Firebase Auth - Bulk User Import Script
 * 
 * This script imports all 40 users from login-account.txt
 * into Firebase Authentication.
 * 
 * Prerequisites:
 * 1. npm install firebase-admin
 * 2. Download service account key from Firebase Console
 * 3. Save as firebaseServiceAccount.json
 * 
 * Usage:
 * node scripts/importUsers.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
try {
  const serviceAccount = require('../firebaseServiceAccount.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'raporasrama2526'
  });
  
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('\n❌ Error: firebaseServiceAccount.json not found!\n');
  console.error('📥 Please download Service Account Key from Firebase Console:');
  console.error('   https://console.firebase.google.com/project/raporasrama2526/settings/serviceaccounts/adminsdk\n');
  console.error('📝 Steps:');
  console.error('   1. Click "Generate new private key"');
  console.error('   2. Save the downloaded file as: firebaseServiceAccount.json');
  console.error('   3. Move it to project root: D:\\Kuch\\rapor-asrama\\firebaseServiceAccount.json');
  console.error('   4. Run this script again: node scripts/importUsers.cjs\n');
  console.error('📚 See DOWNLOAD-SERVICE-KEY.md for detailed instructions.\n');
  process.exit(1);
}

// User accounts from login-account.txt
const users = [
  { username: 'Alif', password: '67v9p' },
  { username: 'Mamad', password: '27y4t' },
  { username: 'AF', password: '72f4q' },
  { username: 'Dio', password: '42k7f' },
  { username: 'Ditok', password: '27y5m' },
  { username: 'Ilham', password: '29n4p' },
  { username: 'Icad', password: '28q5w' },
  { username: 'Uwais', password: '58b3g' },
  { username: 'Zamil', password: '89g7j' },
  { username: 'Riki', password: '85d6r' },
  { username: 'Aji', password: '69h3y' },
  { username: 'Aufa', password: '29v6c' },
  { username: 'Daffa', password: '82a6z' },
  { username: 'Galang', password: '23w7s' },
  { username: 'Hafizh', password: '82n3p' },
  { username: 'Hamdan', password: '86q9t' },
  { username: 'Hanif', password: '87e9k' },
  { username: 'Irshad', password: '87t5b' },
  { username: 'Tahmid', password: '43b7d' },
  { username: 'Yazid', password: '75j2g' },
  { username: 'Aqeela', password: '84u7g' },
  { username: 'Amal', password: '52h8y' },
  { username: 'Annisa', password: '54g6z' },
  { username: 'Izza', password: '26c3y' },
  { username: 'Khansa', password: '64w9y' },
  { username: 'Kuny', password: '92f7n' },
  { username: 'Aza', password: '87h9p' },
  { username: 'Yara', password: '74h9n' },
  { username: 'Nisa', password: '49z3x' },
  { username: 'Tifa', password: '64e5y' },
  { username: 'Aisyah', password: '78u5j' },
  { username: 'Aliynt', password: '52q3h' },
  { username: 'Berlia', password: '95z4e' },
  { username: 'Arin', password: '67w4p' },
  { username: 'Hazu', password: '32p4n' },
  { username: 'Haura', password: '46i2v' },
  { username: 'Nabila', password: '97p6u' },
  { username: 'Najma', password: '84v7n' },
  { username: 'Raisya', password: '95g8i' },
  { username: 'Raudah', password: '67k2g' },
];

// Create users
async function importUsers() {
  console.log(`🚀 Starting import of ${users.length} users...\n`);
  
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const user of users) {
    const email = `${user.username.toLowerCase()}@asrama.com`;
    
    // Firebase requires min 6 characters, add '0' if needed
    const password = user.password.length >= 6 ? user.password : user.password + '0';
    
    try {
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: user.username,
        emailVerified: false, // Set to true if you want to skip verification
      });

      // Optionally set custom claims (role)
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'member',
        username: user.username
      });

      console.log(`✅ Created: ${email} (UID: ${userRecord.uid})`);
      successCount++;

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠️  Already exists: ${email}`);
        successCount++; // Count as success if already exists
      } else {
        console.error(`❌ Failed: ${email} - ${error.message}`);
        failCount++;
        errors.push({ email, error: error.message });
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}/${users.length}`);
  console.log(`❌ Failed: ${failCount}/${users.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => console.log(`  - ${e.email}: ${e.error}`));
  }
  
  console.log('='.repeat(50) + '\n');
  console.log('✅ Import complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Visit Firebase Console to verify users');
  console.log('2. Test login with: alif@asrama.com / 67v9p');
  console.log('3. Update user roles if needed\n');
}

// Export user list to JSON (for Firebase CLI import)
function exportToJSON() {
  const jsonUsers = users.map((user, index) => ({
    localId: `user${index + 1}`,
    email: `${user.username.toLowerCase()}@asrama.com`,
    displayName: user.username,
    passwordHash: Buffer.from(user.password).toString('base64'), // Not actual hash, for demo
    emailVerified: false,
    customAttributes: JSON.stringify({ role: 'member', username: user.username })
  }));

  const outputPath = path.join(__dirname, 'users-import.json');
  fs.writeFileSync(outputPath, JSON.stringify({ users: jsonUsers }, null, 2));
  console.log(`✅ Exported to: ${outputPath}\n`);
}

// Main execution
(async () => {
  try {
    // Export JSON first (optional)
    // exportToJSON();
    
    // Import users
    await importUsers();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
