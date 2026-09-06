'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDatabase, closeDatabase } = require('../src/config/database');
const users = require('../src/repositories/userRepository');

async function main() {
  const fullName = String(process.env.ADMIN_NAME || 'CampusFind Administrator').trim();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const phone = String(process.env.ADMIN_PHONE || '306-585-4407').trim();

  if (!email || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD containing at least 12 characters in .env.');
  }

  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await users.upsertAdmin({ fullName, email, passwordHash, phone });
  console.log(`Admin account ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
