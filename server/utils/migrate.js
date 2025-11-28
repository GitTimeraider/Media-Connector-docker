const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Migrate services from services.json to SQLite database
 */
async function migrateServicesToDatabase() {
  const servicesFile = path.join(__dirname, '../config/services.json');
  
  // Check if services.json exists
  if (!fs.existsSync(servicesFile)) {
    console.log('ℹ No services.json found, skipping migration');
    return;
  }

  try {
    const data = fs.readFileSync(servicesFile, 'utf8');
    const services = JSON.parse(data);
    
    // Check if we've already migrated
    const existingServices = await db.all('SELECT COUNT(*) as count FROM services');
    if (existingServices[0].count > 0) {
      console.log('✓ Services already exist in database, skipping migration');
      return;
    }

    console.log('⚙ Migrating services from JSON to SQLite...');
    let migratedCount = 0;

    // Iterate through each service type
    for (const [type, instances] of Object.entries(services)) {
      if (Array.isArray(instances)) {
        for (const instance of instances) {
          await db.run(
            `INSERT INTO services (id, type, name, url, api_key, username, password, enabled) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              instance.id || require('crypto').randomBytes(16).toString('hex'),
              type,
              instance.name || type,
              instance.url || '',
              instance.apiKey || instance.api_key || null,
              instance.username || null,
              instance.password || null,
              instance.enabled !== false ? 1 : 0
            ]
          );
          migratedCount++;
        }
      }
    }

    console.log(`✓ Migrated ${migratedCount} services to database`);

    // Backup the old file
    const backupFile = servicesFile + '.backup';
    fs.renameSync(servicesFile, backupFile);
    console.log(`✓ Backed up services.json to ${backupFile}`);

  } catch (error) {
    console.error('Error migrating services:', error);
    throw error;
  }
}

/**
 * Migrate users from users.json to SQLite database (if needed)
 */
async function migrateUsersToDatabase() {
  const usersFile = path.join(__dirname, '../data/users.json');
  
  // Check if users.json exists
  if (!fs.existsSync(usersFile)) {
    console.log('ℹ No users.json found, skipping migration');
    return;
  }

  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    const users = JSON.parse(data);
    
    // Check if we've already migrated (beyond the default admin)
    const existingUsers = await db.all('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count >= users.length) {
      console.log('✓ Users already exist in database, skipping migration');
      return;
    }

    console.log('⚙ Migrating users from JSON to SQLite...');
    let migratedCount = 0;

    for (const user of users) {
      // Check if user already exists
      const existing = await db.get('SELECT id FROM users WHERE username = ?', [user.username]);
      if (existing) {
        console.log(`  Skipping ${user.username} (already exists)`);
        continue;
      }

      await db.run(
        `INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)`,
        [user.id, user.username, user.password, user.role]
      );
      migratedCount++;
    }

    console.log(`✓ Migrated ${migratedCount} users to database`);

    // Backup the old file
    const backupFile = usersFile + '.backup';
    fs.renameSync(usersFile, backupFile);
    console.log(`✓ Backed up users.json to ${backupFile}`);

  } catch (error) {
    console.error('Error migrating users:', error);
    throw error;
  }
}

/**
 * Run all migrations
 */
async function runMigrations() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('DATABASE MIGRATION');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    await migrateUsersToDatabase();
    await migrateServicesToDatabase();
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
}

module.exports = { runMigrations };
