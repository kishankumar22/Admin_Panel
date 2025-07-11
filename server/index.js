const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const loginRoutes = require('./routes/loginRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const bodyParser = require('body-parser');
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
const assignroleRoutes = require('./routes/assignroleRoutes');
const importentLogolinkRoutes = require('./routes/importentLogolinkRoutes');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { poolConnect } = require('./config/db'); // Correct import path
const path = require('path');
const os = require('os');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
// const { createUser ,changeUserPassword} = require('./controllers/controller');
// changeUserPassword("Kausar12@gmail.com","Kausar@1","Kishan Kumar")

// Set up Winston logger for errors only with daily rotation
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      level: 'error',
    }),
  ],
});

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors({
  // origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8081'],  //development
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8081','https://jkiop.org','https://admin.jkiop.org'],// production
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(bodyParser.json());

// Use the routes
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
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));



// Root endpoint
app.get('/', (req, res) => {
  res.send('Welcome to Kishan Kumar from IIS server');
});

// Error-handling middleware to log errors to app-YYYY-MM-DD.log
app.use((err, req, res, next) => {
  const statusCode = 500;

  // Log the error to app-YYYY-MM-DD.log in the simplified format
  errorLogger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    status: statusCode,
    method: req.method,
    url: req.url,
  });

  // Send a response to the client
  res.status(statusCode).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start the server and connect to the database
app.listen(PORT, async () => {
  try {
    await poolConnect; // Connect to the database using MSSQL pool
    console.log('Database connected successfully');
  } catch (error) {
    // Do not log database connection errors to console or file as per requirement
  }
});