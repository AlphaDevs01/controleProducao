import express from 'express';
import { db } from '../models/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as XLSX from 'xlsx';

const router = express.Router();
const { Product } = db;

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Update inventory for a product
router.post('/update', async (req, res) => {
  try {
    const { codigo, quantidade } = req.body;
    
    // Validate input
    if (!codigo) {
      return res.status(400).json({ message: 'Product code is required' });
    }
    
    if (quantidade === undefined) {
      return res.status(400).json({ message: 'Quantity is required' });
    }
    
    // Find product
    const product = await Product.findByPk(codigo);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update inventory
    const newQuantity = product.quantidade_estoque + parseInt(quantidade);
    
    // Prevent negative stock (optional, remove if negative stock is allowed)
    if (newQuantity < 0) {
      return res.status(400).json({ 
        message: 'Cannot remove more items than available in stock',
        currentStock: product.quantidade_estoque
      });
    }
    
    await product.update({
      quantidade_estoque: newQuantity
    });
    
    res.json({
      message: 'Inventory updated successfully',
      product: {
        codigo: product.codigo,
        descricao: product.descricao,
        quantidade_estoque: product.quantidade_estoque,
        quantidade_anterior: product.quantidade_estoque - parseInt(quantidade)
      }
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset all inventory to zero
router.post('/reset', async (req, res) => {
  try {
    // Update all products
    await Product.update(
      { quantidade_estoque: 0 },
      { where: {} }
    );
    
    res.json({
      message: 'All inventory reset to zero'
    });
  } catch (error) {
    console.error('Error resetting inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import inventory from Excel/CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ message: 'File is empty or has invalid format' });
    }
    
    // Validate required fields
    const missingFields = [];
    if (!data[0].hasOwnProperty('codigo')) missingFields.push('codigo');
    if (!data[0].hasOwnProperty('quantidade_estoque')) missingFields.push('quantidade_estoque');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Import inventory
    const results = {
      updated: 0,
      errors: []
    };
    
    for (const item of data) {
      try {
        if (!item.codigo || item.quantidade_estoque === undefined) {
          results.errors.push(`Row skipped: Missing required fields for product ${item.codigo || 'unknown'}`);
          continue;
        }
        
        // Find product
        const product = await Product.findByPk(item.codigo);
        
        if (!product) {
          results.errors.push(`Product ${item.codigo} not found`);
          continue;
        }
        
        // Update inventory
        await product.update({
          quantidade_estoque: parseInt(item.quantidade_estoque)
        });
        
        results.updated++;
      } catch (error) {
        console.error(`Error updating inventory for product ${item.codigo}:`, error);
        results.errors.push(`Error updating inventory for product ${item.codigo}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Inventory imported successfully',
      results
    });
  } catch (error) {
    console.error('Error importing inventory:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;