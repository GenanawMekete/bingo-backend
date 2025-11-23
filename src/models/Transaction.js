const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'game_bet', 'game_win', 'bonus', 'referral', 'refund'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ createdAt: 1 });

// Static methods
transactionSchema.statics.createTransaction = async function(userId, type, amount, description = '', metadata = {}) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const balanceBefore = user.balance;
  let balanceAfter = balanceBefore;
  
  // Update user balance based on transaction type
  if (['deposit', 'game_win', 'bonus', 'referral', 'refund'].includes(type)) {
    balanceAfter = balanceBefore + amount;
    user.balance = balanceAfter;
  } else if (['withdrawal', 'game_bet'].includes(type)) {
    if (user.balance < amount) {
      throw new Error('Insufficient balance');
    }
    balanceAfter = balanceBefore - amount;
    user.balance = balanceAfter;
  }
  
  await user.save();
  
  // Create transaction
  const transaction = new this({
    transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user: userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    metadata,
    status: 'completed'
  });
  
  await transaction.save();
  return transaction;
};

transactionSchema.statics.getUserTransactions = function(userId, limit = 50, page = 1) {
  const skip = (page - 1) * limit;
  
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('game', 'gameId type betAmount');
};

transactionSchema.statics.getTotalDeposits = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        type: 'deposit',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
