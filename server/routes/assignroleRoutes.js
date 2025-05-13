const express = require('express');
const router = express.Router();
const { sql, poolConnect, executeQuery } = require('../config/db');

// Save permissions
router.post('/save-permissions', async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions format' });
    }

    const pool = await poolConnect;
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      for (const perm of permissions) {
        // Check if the permission exists for the roleId and pageId
        const checkQuery = `
          SELECT permissionId
          FROM Permission
          WHERE roleId = @roleId AND pageId = @pageId
        `;
        const checkParams = {
          roleId: { type: sql.Int, value: perm.roleId },
          pageId: { type: sql.Int, value: perm.pageId },
        };
        const checkResult = await executeQuery(checkQuery, checkParams, transaction);
        const exists = checkResult.recordset.length > 0;

        if (exists) {
          // Update existing permission
          const updateQuery = `
            UPDATE Permission
            SET canCreate = @canCreate,
                canRead = @canRead,
                canUpdate = @canUpdate,
                canDelete = @canDelete,
                modify_by = @modify_by,
                modify_on = @modify_on
            WHERE roleId = @roleId AND pageId = @pageId
          `;
          const updateParams = {
            roleId: { type: sql.Int, value: perm.roleId },
            pageId: { type: sql.Int, value: perm.pageId },
            canCreate: { type: sql.Bit, value: perm.canCreate },
            canRead: { type: sql.Bit, value: perm.canRead },
            canUpdate: { type: sql.Bit, value: perm.canUpdate },
            canDelete: { type: sql.Bit, value: perm.canDelete },
            modify_by: { type: sql.NVarChar, value: perm.modify_by || 'System' },
            modify_on: { type: sql.DateTime, value: new Date() },
          };
          await executeQuery(updateQuery, updateParams, transaction);
        } else {
          // Insert new permission
          const insertQuery = `
            INSERT INTO Permission (
              roleId, pageId, canCreate, canRead, canUpdate, canDelete,
              created_by, created_on, modify_by, modify_on
            )
            VALUES (
              @roleId, @pageId, @canCreate, @canRead, @canUpdate, @canDelete,
              @created_by, @created_on, @modify_by, @modify_on
            )
          `;
          const insertParams = {
            roleId: { type: sql.Int, value: perm.roleId },
            pageId: { type: sql.Int, value: perm.pageId },
            canCreate: { type: sql.Bit, value: perm.canCreate },
            canRead: { type: sql.Bit, value: perm.canRead },
            canUpdate: { type: sql.Bit, value: perm.canUpdate },
            canDelete: { type: sql.Bit, value: perm.canDelete },
            created_by: { type: sql.NVarChar, value: perm.created_by || 'System' },
            created_on: { type: sql.DateTime, value: new Date(perm.created_on) || new Date() },
            modify_by: { type: sql.NVarChar, value: perm.modify_by || 'System' },
            modify_on: { type: sql.DateTime, value: new Date() },
          };
          await executeQuery(insertQuery, insertParams, transaction);
        }
      }

      await transaction.commit();
      res.status(200).json({ message: 'Permissions saved successfully!' });
    } catch (error) {
      await transaction.rollback();
      // console.error('Transaction error in save-permissions:', error.stack);
          next(err);
      throw error;
    }
  } catch (error) {
    console.error('Error saving permissions:', error.stack);
    res.status(500).json({ message: 'Error saving permissions', error: error.message });
  }
});

// Fetch permissions
router.get('/permissions', async (req, res, next) => {
  try {
    const query = `
      SELECT permissionId, roleId, pageId, canCreate, canRead, canUpdate, canDelete,
             created_by, created_on, modify_by, modify_on
      FROM Permission
    `;
    const result = await executeQuery(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    // console.error('Error fetching permissions:', error.stack);
        next(err);
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
});

module.exports = router;