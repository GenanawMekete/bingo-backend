const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['quick', 'private', 'tournament'],
    default: 'quick'
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'playing', 'ended', 'cancelled'],
    default: 'waiting'
  },
  betAmount: {
    type: Number,
    required: true,
    min: 1
  },
  maxPlayers: {
    type: Number,
    default: 1000
  },
  minPlayers: {
    type: Number,
    default: 2
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    selectedCards: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BingoCard'
    }],
    totalBet: {
      type: Number,
      required: true
    },
    hasClaimedBingo: {
      type: Boolean,
      default: false
    },
    winningPattern: {
      type: String,
      enum: ['single_line', 'double_line', 'triple_line', 'full_house', 'four_corners', 'diagonal', 'x_pattern', 'cross_pattern']
    },
    winningCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BingoCard'
    },
    winnings: {
      type: Number,
      default: 0
    },
    wonAt: Date
  }],
  calledNumbers: [{
    number: {
      type: Number,
      required: true,
      min: 1,
      max: 75
    },
    letter: {
      type: String,
      enum: ['B', 'I', 'N', 'G', 'O']
    },
    calledAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentNumber: {
    number: Number,
    letter: String,
    calledAt: Date
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winningPattern: String,
  potSize: {
    type: Number,
    default: 0
  },
  gameSettings: {
    interval: {
      type: Number,
      default: 30000 // 30 seconds
    },
    numberCallInterval: {
      type: Number,
      default: 2000 // 2 seconds
    },
    maxCardsPerPlayer: {
      type: Number,
      default: 6
    },
    autoStart: {
      type: Boolean,
      default: true
    }
  },
  scheduledStart: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  endedAt: Date,
  endReason: String,
  duration: Number, // in seconds
  isPublic: {
    type: Boolean,
    default: true
  },
  roomCode: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
gameSchema.index({ status: 1, scheduledStart: 1 });
gameSchema.index({ createdAt: 1 });
gameSchema.index({ type: 1, status: 1 });
gameSchema.index({ roomCode: 1 }, { sparse: true });

// Virtuals
gameSchema.virtual('playerCount').get(function() {
  return this.players.length;
});

gameSchema.virtual('calledNumbersCount').get(function() {
  return this.calledNumbers.length;
});

gameSchema.virtual('isFull').get(function() {
  return this.players.length >= this.maxPlayers;
});

gameSchema.virtual('timeUntilStart').get(function() {
  if (this.status !== 'waiting') return 0;
  return Math.max(0, this.scheduledStart - new Date());
});

// Methods
gameSchema.methods.addPlayer = function(userId, selectedCards, totalBet) {
  if (this.status !== 'waiting') {
    throw new Error('Game has already started');
  }
  
  if (this.isFull) {
    throw new Error('Game is full');
  }
  
  if (this.players.some(player => player.user.toString() === userId.toString())) {
    throw new Error('Player already in game');
  }
  
  this.players.push({
    user: userId,
    selectedCards,
    totalBet
  });
  
  this.potSize += totalBet;
  
  return this.players.length;
};

gameSchema.methods.removePlayer = function(userId) {
  const playerIndex = this.players.findIndex(player => 
    player.user.toString() === userId.toString()
  );
  
  if (playerIndex === -1) {
    throw new Error('Player not found in game');
  }
  
  const player = this.players[playerIndex];
  this.potSize -= player.totalBet;
  this.players.splice(playerIndex, 1);
  
  return this.players.length;
};

gameSchema.methods.callNumber = function() {
  if (this.calledNumbers.length >= 75) {
    return null;
  }
  
  let newNumber;
  const calledNumbers = this.calledNumbers.map(cn => cn.number);
  
  do {
    newNumber = Math.floor(Math.random() * 75) + 1;
  } while (calledNumbers.includes(newNumber));
  
  const letters = ['B', 'I', 'N', 'G', 'O'];
  const letterIndex = Math.floor((newNumber - 1) / 15);
  
  const calledNumber = {
    number: newNumber,
    letter: letters[letterIndex],
    calledAt: new Date()
  };
  
  this.calledNumbers.push(calledNumber);
  this.currentNumber = calledNumber;
  
  return calledNumber;
};

gameSchema.methods.markPlayerWin = function(userId, cardId, pattern, winnings) {
  const player = this.players.find(p => p.user.toString() === userId.toString());
  if (!player) {
    throw new Error('Player not found in game');
  }
  
  player.hasClaimedBingo = true;
  player.winningPattern = pattern;
  player.winningCard = cardId;
  player.winnings = winnings;
  player.wonAt = new Date();
  
  this.winner = userId;
  this.winningPattern = pattern;
  this.status = 'ended';
  this.endedAt = new Date();
  this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  this.endReason = `Bingo by player ${userId}`;
  
  return player;
};

gameSchema.methods.getPlayer = function(userId) {
  return this.players.find(player => 
    player.user.toString() === userId.toString()
  );
};

// Static methods
gameSchema.statics.findActiveGames = function() {
  return this.find({
    status: { $in: ['waiting', 'starting', 'playing'] }
  }).populate('players.user', 'telegramId firstName username avatar');
};

gameSchema.statics.findByGameId = function(gameId) {
  return this.findOne({ gameId })
    .populate('players.user', 'telegramId firstName username avatar balance')
    .populate('players.selectedCards')
    .populate('winner', 'telegramId firstName username');
};

gameSchema.statics.getGameStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        activeGames: {
          $sum: {
            $cond: [
              { $in: ['$status', ['waiting', 'starting', 'playing']] },
              1,
              0
            ]
          }
        },
        totalPot: { $sum: '$potSize' },
        averagePlayers: { $avg: { $size: '$players' } }
      }
    }
  ]);
};

// Pre-save middleware
gameSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'playing' && !this.startedAt) {
    this.startedAt = new Date();
  }
  
  if (this.isModified('status') && this.status === 'ended' && !this.endedAt) {
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  next();
});

module.exports = mongoose.model('Game', gameSchema);
