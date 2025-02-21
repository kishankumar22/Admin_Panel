const express = require('express'); 
const dotenv = require('dotenv');
const cors = require('cors'); // Import CORS
const loginRoutes = require('./routes/loginRoutes'); // Correctly import the login routes
const notificationRoutes = require('./routes/notificationRoutes');
const bodyParser = require('body-parser');
const formRoutes = require('./routes/formRoutes');

const bannerRoutes=require('./routes/bannerRoutes')
const facultyRoutes=require('./routes/facultyRoutes')
const galleryRoutes=require('./routes/galleryRoutes')
const importentLogolinkRoutes=require('./routes/importentLogolinkRoutes')
// const { createUser } = require('./controllers/controller');
// createUser()


dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Make sure to parse JSON bodies


// Use the login routes
app.use('/auth', loginRoutes); // Correctly set up the route for login
// Routes
app.use('/form', formRoutes);

// Your code using Cloudinary goes here
// console.log("Cloude details:  ",cloudinary.config());

// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to Kishan Kumar');
});

// Use the notification router for all routes under `/notifications`
app.use('/api/notifications', notificationRoutes);
app.use('/api',bannerRoutes)
app.use('/api',galleryRoutes)
app.use('/api',importentLogolinkRoutes)
app.use('/api',facultyRoutes)
// Routes 

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});