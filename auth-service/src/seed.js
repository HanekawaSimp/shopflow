const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('./db');
const config = require('./config');

async function seed() {
  console.log('[SEED] Initializing database...');
  await initializeDatabase();

  console.log('[SEED] Creating seed users...');

  const users = [
    { email: 'admin@shopflow.io', password: 'admin12345', name: 'Admin User', role: 'admin' },
    { email: 'manager@shopflow.io', password: 'manager12345', name: 'Sarah Manager', role: 'manager' },
    { email: 'user@shopflow.io', password: 'user12345', name: 'John User', role: 'user' },
    { email: 'dev@shopflow.io', password: 'dev12345', name: 'Dev Tester', role: 'user' },
  ];

  for (const user of users) {
    try {
      const hash = await bcrypt.hash(user.password, config.bcrypt.saltRounds);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO NOTHING`,
        [user.email, hash, user.name, user.role]
      );
      console.log(`[SEED] Created user: ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`[SEED] Failed to create ${user.email}:`, err.message);
    }
  }

  console.log('[SEED] Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
