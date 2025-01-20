const jwt = require('jsonwebtoken');
const redis = require('redis');
const { promisify } = require('util');

// Configuración de Redis
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);

class TokenManager {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpire = process.env.JWT_EXPIRE || '1h';
    this.refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || '7d';
  }

  // Generar token de acceso
  async generateAccessToken(userId) {
    const token = jwt.sign({ id: userId }, this.jwtSecret, {
      expiresIn: this.jwtExpire
    });
    
    // Almacenar token en Redis
    await setAsync(`access_token:${userId}:${token}`, 'valid');
    return token;
  }

  // Generar refresh token
  async generateRefreshToken(userId) {
    const refreshToken = jwt.sign({ id: userId }, this.jwtSecret, {
      expiresIn: this.refreshTokenExpire
    });
    
    await setAsync(`refresh_token:${userId}`, refreshToken);
    return refreshToken;
  }

  // Verificar token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Verificar si el token está en la blacklist
      const isBlacklisted = await getAsync(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token inválido');
      }

      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  // Revocar token
  async revokeToken(token) {
    const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
    await setAsync(`blacklist:${token}`, 'revoked', 'EX', decoded.exp - Math.floor(Date.now() / 1000));
  }

  // Rotar claves JWT
  async rotateJWTKeys(newSecret) {
    this.jwtSecret = newSecret;
    await setAsync('jwt_secret', newSecret);
  }

  // Auditoría de tokens
  async tokenAudit(userId) {
    const pattern = `access_token:${userId}:*`;
    const keys = await this._scanRedis(pattern);
    
    return Promise.all(keys.map(async (key) => {
      const token = key.split(':')[2];
      const status = await getAsync(key);
      return { token, status };
    }));
  }

  // Método privado para escanear Redis
  _scanRedis(pattern) {
    return new Promise((resolve, reject) => {
      const found = [];
      const scan = redisClient.scanStream({ match: pattern });
      
      scan.on('data', (keys) => {
        keys.forEach((key) => found.push(key));
      });
      
      scan.on('end', () => resolve(found));
      scan.on('error', reject);
    });
  }
}

module.exports = new TokenManager();
