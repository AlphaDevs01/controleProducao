import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import routeRoutes from './routes/routes.js';
import inventoryRoutes from './routes/inventory.js';
import productionRoutes from './routes/production.js';
import dashboardRoutes from './routes/dashboard.js';
import { authenticateToken } from './middleware/auth.js';
import { initDatabase } from './models/index.js';
import fs from 'fs';

// Load environment variables
dotenv.config();

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Configure file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/routes', authenticateToken, routeRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/production', authenticateToken, productionRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Serve favicon.ico se existir
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, '../dist/favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end(); // No Content
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;