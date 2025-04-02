const express = require('express'); 
const dotenv = require('dotenv');
const cors = require('cors'); // Import CORS
const loginRoutes = require('./routes/loginRoutes'); // Correctly import the login routes
const notificationRoutes = require('./routes/notificationRoutes');
const bodyParser = require('body-parser');
const formRoutes = require('./routes/formRoutes');
const bannerRoutes=require('./routes/bannerRoutes')
const facultyRoutes=require('./routes/facultyRoutes')
const latestPostRoutes=require('./routes/latestPostRoutes')
const galleryRoutes=require('./routes/galleryRoutes')
const userRoutes=require('./routes/userRoutes')
const createpageRoutes=require('./routes/createPageRoutes')
const addStudentsRoutes=require('./routes/students/addStudentsRoutes')
const assignroleRoutes=require('./routes/assignroleRoutes')
const importentLogolinkRoutes=require('./routes/importentLogolinkRoutes');

// const { createUser } = require('./controllers/controller');
// createUser()


dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3002;


// Middleware to parse JSON requests
app.use(express.json());    
app.use(cors({
    origin: "*",  // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],  // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"]  // Allowed headers
  }));
app.use(bodyParser.json()); // Make sure to parse JSON bodies


// Use the login route
app.use('/api', loginRoutes); // Correctly set up thce route for login
// Routes
app.use('/form', formRoutes);

// Your code using Cloudinary goes here
// console.log("Cloude details:  ",cloudinary.config());

// Root endpoint
app.get('/', (req, res) => {
    res.send('Welcome to Kishan Kumar  from local server ');
});

// Use the notification router for all routes under `/notifications`
app.use('/api/notifications', notificationRoutes);
app.use('/api',bannerRoutes)
app.use('/api',galleryRoutes)
app.use('/api',importentLogolinkRoutes)
app.use('/api',facultyRoutes)
app.use('/api',latestPostRoutes)
app.use('/api',userRoutes)
app.use('/api',createpageRoutes)
app.use('/api',assignroleRoutes)
app.use('/api',addStudentsRoutes)

// Routes 

// Start the server
// app.listen(PORT,  () => {
//     console.log(`Server running on http://${PORT}`);
// }); 
// Start the server
app.listen(PORT,  () => {
    console.log(`Server running on http://:${PORT}`);
});
// app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));