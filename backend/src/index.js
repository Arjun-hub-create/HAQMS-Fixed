const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// OLD CODE:
// // Enable CORS for all origins (weak/broad CORS config)
// app.use(cors());
//
// // Body parser
// app.use(express.json());

// NEW CODE:
// FIX (Security): Restrict CORS to known frontend origin instead of allowing all origins.
// In production, set ALLOWED_ORIGIN in your environment.
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' })); // FIX: Add body size limit to prevent DoS

// Request logger — only log method + path, never body (avoids password leaks in logs)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'HAQMS Backend API',
    status: 'Running',
    version: '1.0.0',
  });
});

// OLD CODE:
// // GLOBAL ERROR HANDLER
// // BUG: Improper error handling. It returns the raw error stack trace to the client,
// // which leaks details about database types, schema layout, and file paths.
// app.use((err, req, res, next) => {
//   console.error('[CRITICAL-ERROR]:', err);
//   res.status(500).json({
//     message: 'An unexpected internal server error occurred!',
//     error: err.message,
//     stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
//   });
// });

// NEW CODE:
// FIX (Security): Global error handler no longer leaks stack traces or internal error
// details to the client. Stack is logged server-side only.
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  HAQMS BACKEND running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV}`);
    console.log(`  CORS allowed origin: ${allowedOrigin}`);
    console.log(`=================================================`);
  });
}

module.exports = app;

// OLD CODE:
// // Catch unhandled rejections
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   // Intentionally do not exit process so candidates see unhandled promise logs
// });

// NEW CODE:
// FIX: Graceful shutdown on unhandled rejections instead of silently continuing
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});
