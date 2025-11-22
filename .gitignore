# Bingo Game Backend

A real-time multiplayer bingo game backend built with Node.js, Express, and Socket.io.

## Features

- 🎯 Real-time multiplayer bingo
- 🔄 WebSocket communication
- 🎲 Automated number calling
- ✅ Bingo validation
- 👥 Player management
- 🏆 Win detection

## API Endpoints

### Games
- `POST /api/games` - Create new game
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get game details
- `DELETE /api/games/:id` - Delete game

### Players
- `GET /api/players` - List all players
- `GET /api/players/:id` - Get player details

## Socket Events

### Client to Server
- `join-game` - Join a game
- `leave-game` - Leave a game
- `start-game` - Start the game (host only)
- `mark-number` - Mark a number on card
- `call-bingo` - Claim bingo

### Server to Client
- `game-state-updated` - Game state changed
- `player-joined` - New player joined
- `player-left` - Player left game
- `number-called` - New number called
- `number-marked` - Number marked by player
- `bingo-called` - Bingo claimed
- `game-ended` - Game ended

## Deployment

### Render.com
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables in Render dashboard

### Environment Variables
```env
NODE_ENV=production
PORT=3000
CLIENT_URL=your-frontend-url
JWT_SECRET=your-secret-key
GAME_MAX_PLAYERS=50
NUMBER_CALL_INTERVAL=3000