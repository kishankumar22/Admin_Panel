const express = require('express');
const { sql, executeQuery } = require('../config/db');

const router = express.Router();

// 1. POST Create Page
router.post('/createPage', async (req, res) => {
  try {
    const { pageName, pageUrl, created_by } = req.body;

    if (!pageName || !pageUrl || !created_by) {
      return res.status(400).json({ success: false, message: 'pageName, pageUrl, created_by are required' });
    }

    const query = `
      INSERT INTO Page (pageName, pageUrl, created_by, created_on)
      OUTPUT INSERTED.*
      VALUES (@pageName, @pageUrl, @createdBy, GETDATE())
    `;

    const result = await executeQuery(query, {
      pageName: { type: sql.NVarChar, value: pageName },
      pageUrl: { type: sql.NVarChar, value: `/${pageUrl}` },
      createdBy: { type: sql.NVarChar, value: created_by },
    });

    console.log('Page added:', result.recordset[0].pageName);
    res.status(201).json({ 
      success: true, 
      message: 'Page created successfully', 
      page: result.recordset[0] 
    });
  } catch (err) {
    console.error('Create Page Error:', err);
    res.status(500).json({ success: false, message: 'Error creating page', error: err.message });
  }
});

// 2. GET All Pages
router.get('/pages', async (req, res) => {
  try {
    const result = await executeQuery('SELECT * FROM Page');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch Pages Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching pages', error: err.message });
  }
});

// 3. PUT Update Page
router.put('/updatePage/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { pageName, pageUrl, modify_by } = req.body;

    const existing = await executeQuery(
      `SELECT * FROM Page WHERE pageId = @pageId`,
      { pageId: { type: sql.Int, value: parseInt(pageId) } }
    );

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    const query = `
      UPDATE Page
      SET 
        pageName = @pageName,
        pageUrl = @pageUrl,
        modify_by = @modifyBy,
        modify_on = GETDATE()
      OUTPUT INSERTED.*
      WHERE pageId = @pageId
    `;

    const result = await executeQuery(query, {
      pageId: { type: sql.Int, value: parseInt(pageId) },
      pageName: { type: sql.NVarChar, value: pageName || existing.recordset[0].pageName },
      pageUrl: { type: sql.NVarChar, value: pageUrl ? `/${pageUrl}` : existing.recordset[0].pageUrl },
      modifyBy: { type: sql.NVarChar, value: modify_by },
    });

    console.log('Page updated:', result.recordset[0].pageName);
    res.status(200).json({ 
      success: true, 
      message: 'Page updated successfully', 
      page: result.recordset[0] 
    });
  } catch (err) {
    console.error('Update Page Error:', err);
    res.status(500).json({ success: false, message: 'Error updating page', error: err.message });
  }
});

// 4. DELETE Page
router.delete('/deletePage/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;

    const result = await executeQuery(
      `SELECT * FROM Page WHERE pageId = @pageId`,
      { pageId: { type: sql.Int, value: parseInt(pageId) } }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    await executeQuery(
      `DELETE FROM Page WHERE pageId = @pageId`,
      { pageId: { type: sql.Int, value: parseInt(pageId) } }
    );

    console.log('Page deleted:', result.recordset[0].pageName);
    res.status(200).json({ success: true, message: 'Page deleted successfully' });
  } catch (err) {
    console.error('Delete Page Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting page', error: err.message });
  }
});

module.exports = router;