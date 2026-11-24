require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'codeswap_super_secret_jwt_key_2026_production_grade',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  judge0: {
    apiUrl: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
    apiKey: process.env.JUDGE0_API_KEY || '',
    apiHost: process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',
    timeoutMs: 10000,
  },
  supportedLanguages: ['c', 'cpp', 'java', 'python', 'javascript']
};
