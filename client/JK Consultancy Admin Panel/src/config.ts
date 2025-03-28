//server 
import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: 'https://api.jkiop.org/api' // Ensure HTTPS is used for server
  baseURL: 'http://localhost:3002/api' // Ensure HTTPS is used for local
});

export default axiosInstance;


