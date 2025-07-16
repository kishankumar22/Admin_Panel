// backend/routes/logRoutes.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/:type', (req, res) => {
  const logType = req.params.type; // 'combined', 'error', 'exceptions', or 'rejections'
  const filePath = path.join(__dirname, '../logs', `${logType}.log`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).send('Log file not found.');
    }
    res.send(data);
  });
});

module.exports = router;
