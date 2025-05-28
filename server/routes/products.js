import express from 'express';
import { db } from '../models/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';

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

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['codigo', 'ASC']]
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search products
router.get('/search', async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ message: 'Search term is required' });
    }
    
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { codigo: { [Op.like]: `%${term}%` } },
          { descricao: { [Op.like]: `%${term}%` } }
        ]
      },
      limit: 10
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get product by code
router.get('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const product = await Product.findByPk(codigo);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { codigo, descricao, familia, quantidade_estoque } = req.body;
    
    // Validate input
    if (!codigo || !descricao) {
      return res.status(400).json({ message: 'Product code and description are required' });
    }
    
    // Check if product already exists
    const existingProduct = await Product.findByPk(codigo);
    
    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this code already exists' });
    }
    
    // Create product
    const product = await Product.create({
      codigo,
      descricao,
      familia: familia || null,
      quantidade_estoque: quantidade_estoque || 0
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { descricao, familia, quantidade_estoque } = req.body;
    
    // Find product
    const product = await Product.findByPk(codigo);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update product
    await product.update({
      descricao: descricao || product.descricao,
      familia: familia !== undefined ? familia : product.familia,
      quantidade_estoque: quantidade_estoque !== undefined ? quantidade_estoque : product.quantidade_estoque
    });
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Find product
    const product = await Product.findByPk(codigo);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete product
    await product.destroy();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import products from Excel/CSV
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
    if (!data[0].hasOwnProperty('descricao')) missingFields.push('descricao');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Import products
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };
    
    for (const item of data) {
      try {
        if (!item.codigo || !item.descricao) {
          results.errors.push(`Row skipped: Missing required fields for product ${item.codigo || 'unknown'}`);
          continue;
        }
        
        const [product, created] = await Product.findOrCreate({
          where: { codigo: item.codigo },
          defaults: {
            descricao: item.descricao,
            familia: item.familia || null,
            quantidade_estoque: item.quantidade_estoque || 0
          }
        });
        
        if (!created) {
          // Update existing product
          await product.update({
            descricao: item.descricao,
            familia: item.familia !== undefined ? item.familia : product.familia
            // Note: We don't update quantidade_estoque here to avoid overwriting stock data
          });
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        console.error(`Error importing product ${item.codigo}:`, error);
        results.errors.push(`Error importing product ${item.codigo}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Products imported successfully',
      results
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;