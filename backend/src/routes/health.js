const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const os = require('os');

router.get('/', async (req, res) => {
    try {
        // Check database connection
        await sequelize.authenticate();
        
        // System information
        const systemInfo = {
            uptime: process.uptime(),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            cpu: os.loadavg(),
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'development'
        };

        res.json({
            status: 'healthy',
            database: 'connected',
            ...systemInfo
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message
        });
    }
});

module.exports = router;
