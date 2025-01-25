//config/cloudanaryConfig.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dxqmmofie',
  api_key: '936736316696224',
  api_secret: 'cyrZOdKd9FncLjRumUrBgiYXAqc'
});

module.exports = cloudinary;