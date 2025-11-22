services:
  - type: web
    name: bingo-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: CLIENT_URL
        value: https://frontend.onrender.com
      - key: SECRET_KEY
        generateValue: true
