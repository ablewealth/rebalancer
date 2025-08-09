#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static('.'));

// Serve files from src directory
app.use('/src', express.static('src'));

// Serve files from data directory  
app.use('/data', express.static('data'));

// Custom route for debug testing
app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug-site.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'Test server is running'
    });
});

// List available files endpoint for debugging
app.get('/api/files', (req, res) => {
    const files = {
        pages: [],
        scripts: [],
        models: [],
        data: []
    };

    try {
        // Check for HTML pages
        const srcDir = path.join(__dirname, 'src');
        if (fs.existsSync(srcDir)) {
            const srcFiles = fs.readdirSync(srcDir);
            files.pages = srcFiles.filter(f => f.endsWith('.html'));
        }

        // Check for JS files
        const jsDir = path.join(__dirname, 'src', 'js');
        if (fs.existsSync(jsDir)) {
            const jsFiles = fs.readdirSync(jsDir);
            files.scripts = jsFiles.filter(f => f.endsWith('.js'));
        }

        // Check for model files
        const modelsDir = path.join(__dirname, 'src', 'data', 'models');
        if (fs.existsSync(modelsDir)) {
            const modelFiles = fs.readdirSync(modelsDir);
            files.models = modelFiles.filter(f => f.endsWith('.csv'));
        }

        // Check for data files
        const dataDir = path.join(__dirname, 'data', 'models');
        if (fs.existsSync(dataDir)) {
            const dataFiles = fs.readdirSync(dataDir);
            files.data = dataFiles.filter(f => f.endsWith('.csv'));
        }

        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Test server running at http://localhost:${PORT}`);
    console.log(`📊 Debug page: http://localhost:${PORT}/debug`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📁 File listing: http://localhost:${PORT}/api/files`);
    console.log(`\nAvailable pages:`);
    
    // List available HTML files
    try {
        const srcDir = path.join(__dirname, 'src');
        if (fs.existsSync(srcDir)) {
            const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
            htmlFiles.forEach(file => {
                console.log(`  📄 http://localhost:${PORT}/src/${file}`);
            });
        }
    } catch (error) {
        console.log('Could not list HTML files:', error.message);
    }
});