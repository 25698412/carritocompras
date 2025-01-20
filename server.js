const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { protect } = require('./middleware/auth');
const setupSwagger = require('./utils/swagger');

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
connectDB();

// Crear servidor Express
const app = express();

// Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Security headers
app.use(helmet());

// Request logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// Configurar Swagger documentation
setupSwagger(app);

// Servir archivos estáticos desde el directorio carrito-compras
app.use(express.static(path.join(__dirname)));

// Rutas API
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', protect, require('./routes/orderRoutes'));

// Rutas de la aplicación
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, './login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, './register.html'));
});

app.get('/profile', protect, (req, res) => {
  res.sendFile(path.join(__dirname, './profile.html'));
});

// Manejar rutas no encontradas
app.use(require('./middleware/errorMiddleware').notFound);

// Manejo de errores
app.use(require('./middleware/errorMiddleware').errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: El puerto ${PORT} está en uso.`);
    process.exit(1);
  } else {
    throw err;
  }
});
