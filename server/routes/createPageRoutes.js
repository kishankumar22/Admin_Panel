const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Create Page
router.post('/createPage', async (req, res) => {
    try {
        const { pageName, pageUrl, created_by } = req.body;

        if (!pageName || !pageUrl || !created_by) {
            return res.status(400).json({ message: 'pageName, pageUrl, created_by are required.' });
        }

        const newPage = await prisma.page.create({
            data: {
                pageName,
                pageUrl: `/${pageUrl}`,
                created_by,
                created_on: new Date(),
            },
        });

        res.status(201).json({ message: 'Page created successfully!', page: newPage });
    } catch (error) {
        console.error('Error creating page:', error);
        res.status(500).json({ message: 'Error creating page', error });
    }
});

// Get all Pages
router.get('/pages', async (req, res) => {
    try {
        const pages = await prisma.page.findMany();
        res.status(200).json(pages);
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ message: 'Error fetching pages', error });
    }
});

// Update Page
router.put('/updatePage/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const { pageName, pageUrl, modify_by } = req.body;

        const updatedPage = await prisma.page.update({
            where: { pageId: Number(pageId) },
            data: {
                pageName,
                pageUrl: `/${pageUrl}`,
                modify_by,
                modify_on: new Date(),
            },
        });

        res.status(200).json({ message: 'Page updated successfully!', page: updatedPage });
    } catch (error) {
        console.error('Error updating page:', error);
        res.status(500).json({ message: 'Error updating page', error });
    }
});

// Delete Page
router.delete('/deletePage/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;

        await prisma.page.delete({
            where: { pageId: Number(pageId) },
        });

        res.status(200).json({ message: 'Page deleted successfully!' });
    } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ message: 'Error deleting page', error });
    }
});

module.exports = router;
