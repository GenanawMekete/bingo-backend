const mongoose = require('mongoose');
const logger = require('../../utils/logger');

async function run() {
  logger.info('Creating sample rooms...');
  
  const Room = mongoose.model('Room');
  
  // Check if sample rooms already exist
  const existingRooms = await Room.find({ name: { $in: ['Quick Play', 'Pro League', 'Free Entry'] } });
  if (existingRooms.length > 0) {
    logger.info('⏭️  Sample rooms already exist');
    return;
  }

  const sampleRooms = [
    {
      name: 'Quick Play',
      description: 'Fast-paced 30-second games for quick fun!',
      config: {
        type: 'public',
        maxPlayers: 50,
        gameDuration: 30,
        entryFee: 0,
        autoStart: true,
        minPlayersToStart: 2
      }
    },
    {
      name: 'Pro League',
      description: 'Competitive games with entry fees and bigger prizes',
      config: {
        type: 'public',
        maxPlayers: 25,
        gameDuration: 45,
        entryFee: 10,
        prizePool: 250,
        autoStart: true,
        minPlayersToStart: 4
      }
    },
    {
      name: 'Free Entry',
      description: 'Practice and learn the game with no entry fee',
      config: {
        type: 'public',
        maxPlayers: 100,
        gameDuration: 60,
        entryFee: 0,
        autoStart: false,
        minPlayersToStart: 2
      }
    }
  ];

  for (const roomData of sampleRooms) {
    const room = new Room({
      ...roomData,
      roomId: `SAMPLE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    });
    
    await room.save();
    logger.info(`✅ Created room: ${roomData.name}`);
  }

  logger.info('🎉 Sample rooms created successfully');
}

module.exports = {
  name: 'sampleRooms',
  run
};
