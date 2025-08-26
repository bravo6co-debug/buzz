import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { db } from '@buzz/database';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import businessRoutes from './routes/business.js';
import mileageRoutes from './routes/mileage.js';
import couponRoutes from './routes/coupon.js';
import qrRoutes from './routes/qr.js';
import referralRoutes from './routes/referral.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import eventRoutes from './routes/event.js';

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Session store setup
const PostgresStore = pgSession(session);
const sessionStore = new PostgresStore({
  pool: db.pool, // Use the database pool from @buzz/database
  tableName: 'user_sessions',
  createTableIfMissing: true,
});

// Middleware
app.use(limiter);
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'buzz.sid'
}));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Buzz Platform API',
      version: '1.0.0',
      description: 'API documentation for Buzz platform - 정부 주도 지역경제 활성화 바이럴 마케팅 시스템',
      contact: {
        name: 'Buzz Platform Team',
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        session: {
          type: 'apiKey',
          in: 'cookie',
          name: 'buzz.sid'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts'], // Path to the API files
};

const swaggerSpecs = swaggerJSDoc(swaggerOptions);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Buzz Platform API Docs'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes); // Alternative path for admin
app.use('/api/businesses', businessRoutes);
app.use('/api/business', businessRoutes); // For business owner routes
app.use('/api/mileage', mileageRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/events', eventRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Buzz API Server running on http://${HOST}:${PORT}`);
  console.log(`📚 API Documentation available at http://${HOST}:${PORT}/docs`);
  console.log(`🏥 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  sessionStore.close?.(() => {
    console.log('Session store closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  sessionStore.close?.(() => {
    console.log('Session store closed.');
    process.exit(0);
  });
});

export default app;