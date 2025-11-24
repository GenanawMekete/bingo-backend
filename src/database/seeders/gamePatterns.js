const mongoose = require('mongoose');
const logger = require('../../utils/logger');

async function run() {
  logger.info('Setting up game patterns configuration...');
  
  // This seeder doesn't create actual database records
  // but ensures the game patterns are properly configured
  // in the application constants
  
  const patterns = [
    {
      name: 'line',
      displayName: 'Row or Column',
      description: 'Complete one entire row or column',
      patterns: [
        'Complete horizontal line (any row)',
        'Complete vertical line (any column)'
      ]
    },
    {
      name: 'diagonal',
      displayName: 'Diagonal',
      description: 'Complete one diagonal line',
      patterns: [
        'Top-left to bottom-right diagonal',
        'Top-right to bottom-left diagonal'
      ]
    },
    {
      name: 'four_corners',
      displayName: 'Four Corners',
      description: 'Mark all four corner cells',
      patterns: [
        'Top-left, top-right, bottom-left, bottom-right'
      ]
    }
  ];

  logger.info('✅ Game patterns configured:');
  patterns.forEach(pattern => {
    logger.info(`   📊 ${pattern.displayName}: ${pattern.description}`);
  });

  // Create a configuration document if needed
  const Config = mongoose.model('Config', new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
  }));

  await Config.findOneAndUpdate(
    { key: 'winning_patterns' },
    { 
      key: 'winning_patterns',
      value: patterns,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  logger.info('✅ Winning patterns saved to database configuration');
}

module.exports = {
  name: 'gamePatterns',
  run
};
