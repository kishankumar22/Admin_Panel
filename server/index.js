const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { poolConnect } = require('./config/db');

const logger = require('./utils/logger');  // 👈 Correct Import Path

// Import Routes
const loginRoutes = require('./routes/loginRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const formRoutes = require('./routes/formRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const latestPostRoutes = require('./routes/latestPostRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const userRoutes = require('./routes/userRoutes');
const createpageRoutes = require('./routes/createPageRoutes');
const addStudentsRoutes = require('./routes/students/addStudentsRoutes');
const paymentHandoverRoutes = require('./routes/students/paymentHandoverRoutes');
const addSuppliersRoutes = require('./routes/ManageSuppliers/addSuppliersRoutes');
const addexpenseRoutes = require('./routes/ManageSuppliers/addexpenseRoutes');
const placementRoutes = require('./routes/placement/placementRoutes');
const assignroleRoutes = require('./routes/assignroleRoutes');
const importentLogolinkRoutes = require('./routes/importentLogolinkRoutes');
const logRoutes = require('./routes/logRoutes');




// Load Environment Variables
dotenv.config();

// App Setup
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8081',
    'https://jkiop.org',
    'https://admin.jkiop.org'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(bodyParser.json());

// Routes
app.use('/api', loginRoutes);
app.use('/form', formRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', bannerRoutes);
app.use('/api', galleryRoutes);
app.use('/api', importentLogolinkRoutes);
app.use('/api', facultyRoutes);
app.use('/api', latestPostRoutes);
app.use('/api', userRoutes);
app.use('/api', createpageRoutes);
app.use('/api', assignroleRoutes);
app.use('/api', addStudentsRoutes);
app.use('/api', paymentHandoverRoutes);
app.use('/api', addSuppliersRoutes);
app.use('/api', addexpenseRoutes);
app.use('/api', placementRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/logs', logRoutes);


// Root Endpoint
app.get('/', (req, res) => {
  res.send('Welcome to Kishan Kumar from IIS server');
});

// Error-handling Middleware (ONLY ONCE)
app.use((err, req, res, next) => {
  logger.error('Error Occurred', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url
  });

  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start Server
app.listen(PORT, async () => {
  try {
    await poolConnect;
    console.log('Database connected successfully');
  } catch (error) {
    logger.error('Database Connection Failed', { message: error.message });
  }
});
