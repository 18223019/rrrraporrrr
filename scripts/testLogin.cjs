/**
 * Script diagnostik: set password test yang PASTI benar untuk satu akun,
 * supaya bisa isolasi apakah masalah login ada di data (sheet/typo)
 * atau di tempat lain (misal build/config yang salah).
 *
 * Usage:
 *   node scripts/testLogin.cjs <username>
 *
 * Contoh:
 *   node scripts/testLogin.cjs Aqeela
 *
 * Setelah dijalankan, coba login di aplikasi pakai:
 *   username: (sesuai yang diketik)
 *   password: Test123456
 */

const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../firebaseServiceAccount.json';

let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch (error) {
  console.error('❌ Error: firebaseServiceAccount.json tidak ditemukan!');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const TEST_PASSWORD = 'Test123456';
const [, , username] = process.argv;

if (!username) {
  console.error('Usage: node scripts/testLogin.cjs <username>');
  process.exit(1);
}

(async () => {
  try {
    const uid = username;
    const user = await admin.auth().getUser(uid);

    console.log('📋 Data akun saat ini di Firebase:');
    console.log(`   UID          : ${user.uid}`);
    console.log(`   Email        : ${user.email}`);
    console.log(`   Display Name : ${user.displayName}`);
    console.log(`   Project      : ${serviceAccount.project_id}`);
    console.log('');

    await admin.auth().updateUser(uid, { password: TEST_PASSWORD });

    console.log(`✅ Password sudah diganti sementara ke: ${TEST_PASSWORD}`);
    console.log('');
    console.log('👉 Sekarang coba login di aplikasi pakai:');
    console.log(`   Username : ${username}`);
    console.log(`   Password : ${TEST_PASSWORD}`);
    console.log('');
    console.log('Kalau BERHASIL login -> masalahnya ada di data password lama di Sheet (typo/karakter tersembunyi).');
    console.log('Kalau MASIH GAGAL login -> masalahnya bukan di password, kemungkinan besar app yang di-deploy nyambung ke Firebase project yang beda dari yang ini.');
  } catch (error) {
    console.error(`❌ Gagal: ${error.message}`);
    if (error.code === 'auth/user-not-found') {
      console.error('   -> Akun dengan UID ini tidak ditemukan di project Firebase yang sedang dipakai script ini.');
    }
    process.exit(1);
  }
})();
