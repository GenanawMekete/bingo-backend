const mongoose = require('mongoose');
const { MONGODB_URI } = require('../../config/database');
const logger = require('../../utils/logger');

class MigrationManager {
  constructor() {
    this.migrations = [];
    this.migrationCollection = 'migrations';
  }

  async connect() {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('✅ Connected to MongoDB for migrations');
    } catch (error) {
      logger.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
  }

  async registerMigration(name, migrationFunction) {
    this.migrations.push({ name, run: migrationFunction });
  }

  async runMigrations() {
    await this.connect();

    try {
      // Ensure migrations collection exists
      const db = mongoose.connection.db;
      const collections = await db.listCollections({ name: this.migrationCollection }).toArray();
      if (collections.length === 0) {
        await db.createCollection(this.migrationCollection);
        logger.info('📁 Created migrations collection');
      }

      // Get already executed migrations
      const MigrationModel = mongoose.model('Migration', new mongoose.Schema({
        name: String,
        executedAt: { type: Date, default: Date.now }
      }));
      
      const executedMigrations = await MigrationModel.find({});
      const executedMigrationNames = new Set(executedMigrations.map(m => m.name));

      // Run pending migrations
      let executedCount = 0;
      
      for (const migration of this.migrations) {
        if (!executedMigrationNames.has(migration.name)) {
          logger.info(`🔄 Running migration: ${migration.name}`);
          
          try {
            await migration.run();
            
            // Record successful migration
            await MigrationModel.create({ name: migration.name });
            executedCount++;
            
            logger.info(`✅ Migration completed: ${migration.name}`);
          } catch (error) {
            logger.error(`❌ Migration failed: ${migration.name}`, error);
            throw error;
          }
        } else {
          logger.info(`⏭️  Migration already executed: ${migration.name}`);
        }
      }

      logger.info(`🎉 Migrations completed. Executed ${executedCount} new migration(s).`);
      
    } finally {
      await this.disconnect();
    }
  }

  async listMigrations() {
    await this.connect();
    
    try {
      const MigrationModel = mongoose.model('Migration', new mongoose.Schema({
        name: String,
        executedAt: Date
      }));
      
      const executedMigrations = await MigrationModel.find({}).sort({ executedAt: 1 });
      
      logger.info('📋 Migration Status:');
      logger.info('===================');
      
      this.migrations.forEach(migration => {
        const executed = executedMigrations.find(m => m.name === migration.name);
        const status = executed ? '✅ Executed' : '⏳ Pending';
        const date = executed ? `(${executed.executedAt.toISOString()})` : '';
        logger.info(`${status}: ${migration.name} ${date}`);
      });
      
    } finally {
      await this.disconnect();
    }
  }
}

// Create migration manager instance
const migrationManager = new MigrationManager();

// Register all migrations
const migrationFiles = [
  require('./001_create_players'),
  require('./002_create_games'),
  require('./003_create_rooms'),
  require('./004_create_bingocards'),
  require('./005_create_transactions'),
  require('./006_create_indexes')
];

migrationFiles.forEach(migration => {
  migrationManager.registerMigration(migration.name, migration.run);
});

// CLI handling
const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'run':
        await migrationManager.runMigrations();
        break;
      case 'list':
        await migrationManager.listMigrations();
        break;
      case 'reset':
        logger.warn('Reset command not implemented for safety');
        break;
      default:
        logger.info('Usage: node runMigrations.js [run|list]');
        logger.info('  run  - Execute pending migrations');
        logger.info('  list - List migration status');
    }
  } catch (error) {
    logger.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = migrationManager;
