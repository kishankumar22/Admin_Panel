const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Save permissions
router.post('/save-permissions', async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions format' });
    }

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { roleId_pageId: { roleId: perm.roleId, pageId: perm.pageId } },
        update: {
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
          modify_by: perm.modify_by,
          modify_on: new Date(),
        },
        create: {
          roleId: perm.roleId,
          pageId: perm.pageId,
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
          created_by: perm.created_by,
          created_on: new Date(),
        },
      });
    }

    res.status(200).json({ message: 'Permissions saved successfully!' });
  } catch (error) {
    console.error('Error saving permissions:', error);
    res.status(500).json({ message: 'Error saving permissions', error });
  }
});

// Fetch permissions
router.get('/permissions', async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.status(200).json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Error fetching permissions', error });
  }
});

module.exports = router;