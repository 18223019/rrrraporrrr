/**
 * Script untuk sinkronisasi akun dari Google Sheets ke Firebase Auth
 * Jalankan sekali saat bootstrap: node scripts/syncAccounts.js
 * 
 * Catatan Keamanan:
 * - Pastikan firebaseServiceAccount.json tidak di-commit ke git
 * - Gunakan .env untuk menyimpan SHEET_ID dan path service account
 * - Password awal akan di-set, user harus mengubahnya kemudian
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Konfigurasi
const SHEET_ID = process.env.SHEET_ID || '1WaK0XuJrP5adiJkL4KvR1LoPCOURPcIumAK1sKlA3j8';
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebaseServiceAccount.json';

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch (error) {
  console.error('❌ Error: firebaseServiceAccount.json tidak ditemukan!');
  console.error('   Download dari Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();

/**
 * Baca data dari Google Sheets (metadata tab)
 */
async function readSheetData() {
  console.log('📖 Membaca data dari Google Sheets...');
  
  // Initialize Google Sheets dengan service account
  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
  await doc.loadInfo();
  
  console.log(`   Sheet: ${doc.title}`);
  
  // Load metadata sheet
  const sheet = doc.sheetsByTitle['metadata'];
  if (!sheet) {
    throw new Error('Sheet "metadata" tidak ditemukan!');
  }
  
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  
  console.log(`   Ditemukan ${rows.length} baris data\n`);
  
  // Parse data
  const members = rows.map(row => ({
    name: row.get('Nama'),
    username: row.get('username') || row.get('Panggilan'),
    email: row.get('email'),
    password: row.get('password'),
    role: (row.get('role') || '').trim().toLowerCase() === 'coach'
  ? 'coach'
  : (row.get('Nama') || '').toLowerCase().includes('coach') ? 'coach' : 'member'
  }));
  
  return members;
}

/**
 * Sinkronisasi user ke Firebase Auth
 */
async function syncUsers(members) {
  console.log('🔄 Memulai sinkronisasi...\n');
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  for (const member of members) {
    const { name, username, password, role } = member;
    
    if (!username || !password) {
      console.log(`⚠️  SKIP: ${name} - username/password kosong`);
      errors++;
      continue;
    }
    
    const uid = username; // UID = username/panggilan
    const email = `${username}@asrama.com`; // Email sintetis
    
    try {
      // Cek apakah user sudah ada
      let userRecord;
      try {
        userRecord = await auth.getUser(uid);
        
        // Update existing user
        await auth.updateUser(uid, {
          email,
          password,
          displayName: name,
        });
        
        // Set custom claims
        await auth.setCustomUserClaims(uid, { role });
        
        console.log(`✅ UPDATE: ${username} (${role})`);
        updated++;
        
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user
          userRecord = await auth.createUser({
            uid,
            email,
            password,
            displayName: name,
          });
          
          // Set custom claims
          await auth.setCustomUserClaims(uid, { role });
          
          console.log(`✅ CREATE: ${username} (${role})`);
          created++;
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error(`❌ ERROR: ${username} - ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n📊 Ringkasan:');
  console.log(`   ✅ Dibuat: ${created}`);
  console.log(`   🔄 Diupdate: ${updated}`);
  console.log(`   ❌ Error: ${errors}`);
  console.log(`   📝 Total: ${members.length}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Sinkronisasi Akun - Rapor Asrama\n');
  console.log('⚙️  Konfigurasi:');
  console.log(`   Sheet ID: ${SHEET_ID}`);
  console.log(`   Project: ${serviceAccount.project_id}\n`);
  
  try {
    const members = await readSheetData();
    await syncUsers(members);
    
    console.log('\n✅ Sinkronisasi selesai!');
    console.log('\n⚠️  PENTING:');
    console.log('   - Password saat ini masih default dari Sheet');
    console.log('   - Instruksikan user untuk mengubah password mereka');
    console.log('   - Jangan simpan password di Sheet untuk produksi');
    
  } catch (error) {
    console.error('\n❌ Error saat sinkronisasi:', error.message);
    process.exit(1);
  }
}

// Run
main();
