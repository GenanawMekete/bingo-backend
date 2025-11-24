const mongoose = require('mongoose');
const logger = require('../../utils/logger');

async function run() {
  logger.info('Creating bingocards collection...');
  
  const bingoCardSchema = new mongoose.Schema({
    cardId: { type: String, required: true, unique: true },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    numbers: {
      B: [{ type: Number, min: 1, max: 15 }],
      I: [{ type: Number, min: 16, max: 30 }],
      N: [{ type: Number, min: 31, max: 45 }],
      G: [{ type: Number, min: 46, max: 60 }],
      O: [{ type: Number, min: 61, max: 75 }]
    },
    markedNumbers: [{
      number: { type: Number, required: true },
      position: {
        row: { type: Number, min: 0, max: 4 },
        col: { type: Number, min: 0, max: 4 }
      },
      markedAt: { type: Date, default: Date.now }
    }],
    hasBingo: { type: Boolean, default: false },
    winningPattern: { type: String, enum: ['line', 'diagonal', 'four_corners'] },
    winningNumbers: [Number],
    bingoDeclaredAt: Date,
    isActive: { type: Boolean, default: true }
  }, {
    timestamps: true
  });

  // Add TTL index for auto-deletion after 7 days
  bingoCardSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

  mongoose.model('BingoCard', bingoCardSchema);
  logger.info('✅ BingoCards collection schema created with TTL index');
}

module.exports = {
  name: '004_create_bingocards',
  run
};
