import express from 'express';
import { db } from '../models/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { Op } from 'sequelize';

const router = express.Router();
const { ProductionRoute, RouteInput, Product } = db;

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

// Get all production routes
router.get('/', async (req, res) => {
  try {
    const routes = await ProductionRoute.findAll({
      include: [
        { 
          model: RouteInput, 
          as: 'insumos',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['descricao'],
              required: false
            }
          ]
        }
      ],
      order: [['codigo_produto_final', 'ASC']]
    });
    
    // Format the response
    const formattedRoutes = await Promise.all(routes.map(async (route) => {
      // Get product description
      const product = await Product.findByPk(route.codigo_produto_final);
      
      // Format inputs with product descriptions
      const formattedInputs = await Promise.all(route.insumos.map(async (input) => {
        const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
        return {
          codigo_produto_insumo: input.codigo_produto_insumo,
          quantidade_utilizada: input.quantidade_utilizada,
          descricao_insumo: inputProduct ? inputProduct.descricao : null
        };
      }));
      
      return {
        id: route.id,
        codigo_produto_final: route.codigo_produto_final,
        descricao_produto_final: product ? product.descricao : null,
        insumos: formattedInputs
      };
    }));
    
    res.json(formattedRoutes);
  } catch (error) {
    console.error('Error fetching production routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get production route by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const route = await ProductionRoute.findByPk(id, {
      include: [{ model: RouteInput, as: 'insumos' }]
    });
    
    if (!route) {
      return res.status(404).json({ message: 'Production route not found' });
    }
    
    // Get product description
    const product = await Product.findByPk(route.codigo_produto_final);
    
    // Format inputs with product descriptions
    const formattedInputs = await Promise.all(route.insumos.map(async (input) => {
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      return {
        codigo_produto_insumo: input.codigo_produto_insumo,
        quantidade_utilizada: input.quantidade_utilizada,
        descricao_insumo: inputProduct ? inputProduct.descricao : null
      };
    }));
    
    const formattedRoute = {
      id: route.id,
      codigo_produto_final: route.codigo_produto_final,
      descricao_produto_final: product ? product.descricao : null,
      insumos: formattedInputs
    };
    
    res.json(formattedRoute);
  } catch (error) {
    console.error('Error fetching production route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create production route
router.post('/', async (req, res) => {
  try {
    const { codigo_produto_final, insumos } = req.body;
    
    // Validate input
    if (!codigo_produto_final) {
      return res.status(400).json({ message: 'Product code is required' });
    }
    
    if (!insumos || !Array.isArray(insumos) || insumos.length === 0) {
      return res.status(400).json({ message: 'At least one input is required' });
    }
    
    // Check if product exists
    const product = await Product.findByPk(codigo_produto_final);
    
    if (!product) {
      return res.status(400).json({ message: 'Product not found' });
    }
    
    // Check if route already exists for this product
    const existingRoute = await ProductionRoute.findOne({
      where: { codigo_produto_final }
    });
    
    if (existingRoute) {
      return res.status(400).json({ message: 'A production route already exists for this product' });
    }
    
    // Check if all input products exist
    for (const input of insumos) {
      if (!input.codigo_produto_insumo || !input.quantidade_utilizada) {
        return res.status(400).json({ message: 'Input product code and quantity are required' });
      }
      
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      
      if (!inputProduct) {
        return res.status(400).json({ message: `Input product ${input.codigo_produto_insumo} not found` });
      }
    }
    
    // Create route and inputs
    const route = await ProductionRoute.create({
      codigo_produto_final
    });
    
    for (const input of insumos) {
      await RouteInput.create({
        route_id: route.id,
        codigo_produto_insumo: input.codigo_produto_insumo,
        quantidade_utilizada: input.quantidade_utilizada
      });
    }
    
    // Get the created route with inputs
    const createdRoute = await ProductionRoute.findByPk(route.id, {
      include: [{ model: RouteInput, as: 'insumos' }]
    });
    
    res.status(201).json(createdRoute);
  } catch (error) {
    console.error('Error creating production route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update production route
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_produto_final, insumos } = req.body;
    
    // Find route
    const route = await ProductionRoute.findByPk(id);
    
    if (!route) {
      return res.status(404).json({ message: 'Production route not found' });
    }
    
    // Validate input
    if (!insumos || !Array.isArray(insumos) || insumos.length === 0) {
      return res.status(400).json({ message: 'At least one input is required' });
    }
    
    // Check if all input products exist
    for (const input of insumos) {
      if (!input.codigo_produto_insumo || !input.quantidade_utilizada) {
        return res.status(400).json({ message: 'Input product code and quantity are required' });
      }
      
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      
      if (!inputProduct) {
        return res.status(400).json({ message: `Input product ${input.codigo_produto_insumo} not found` });
      }
    }
    
    // Update route if product code is provided
    if (codigo_produto_final && codigo_produto_final !== route.codigo_produto_final) {
      // Check if product exists
      const product = await Product.findByPk(codigo_produto_final);
      
      if (!product) {
        return res.status(400).json({ message: 'Product not found' });
      }
      
      // Check if route already exists for this product
      const existingRoute = await ProductionRoute.findOne({
        where: { 
          codigo_produto_final,
          id: { [Op.ne]: id } // Not the current route
        }
      });
      
      if (existingRoute) {
        return res.status(400).json({ message: 'A production route already exists for this product' });
      }
      
      await route.update({ codigo_produto_final });
    }
    
    // Delete existing inputs
    await RouteInput.destroy({
      where: { route_id: id }
    });
    
    // Create new inputs
    for (const input of insumos) {
      await RouteInput.create({
        route_id: id,
        codigo_produto_insumo: input.codigo_produto_insumo,
        quantidade_utilizada: input.quantidade_utilizada
      });
    }
    
    // Get the updated route with inputs
    const updatedRoute = await ProductionRoute.findByPk(id, {
      include: [{ model: RouteInput, as: 'insumos' }]
    });
    
    res.json(updatedRoute);
  } catch (error) {
    console.error('Error updating production route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete production route
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find route
    const route = await ProductionRoute.findByPk(id);
    
    if (!route) {
      return res.status(404).json({ message: 'Production route not found' });
    }
    
    // Delete route and inputs (cascade delete will handle inputs)
    await route.destroy();
    
    res.json({ message: 'Production route deleted successfully' });
  } catch (error) {
    console.error('Error deleting production route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import production routes from Excel/CSV
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
    if (!data[0].hasOwnProperty('codigo_produto_final')) missingFields.push('codigo_produto_final');
    if (!data[0].hasOwnProperty('insumos')) missingFields.push('insumos');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Import routes
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };
    
    for (const item of data) {
      try {
        if (!item.codigo_produto_final || !item.insumos) {
          results.errors.push(`Row skipped: Missing required fields for route ${item.codigo_produto_final || 'unknown'}`);
          continue;
        }
        
        // Parse insumos if it's a string
        let insumos = item.insumos;
        if (typeof insumos === 'string') {
          try {
            insumos = JSON.parse(insumos);
          } catch (e) {
            results.errors.push(`Error parsing insumos for route ${item.codigo_produto_final}: ${e.message}`);
            continue;
          }
        }
        
        if (!Array.isArray(insumos)) {
          results.errors.push(`Invalid insumos format for route ${item.codigo_produto_final}`);
          continue;
        }
        
        // Check if product exists
        const product = await Product.findByPk(item.codigo_produto_final);
        
        if (!product) {
          results.errors.push(`Product ${item.codigo_produto_final} not found`);
          continue;
        }
        
        // Find existing route
        const existingRoute = await ProductionRoute.findOne({
          where: { codigo_produto_final: item.codigo_produto_final }
        });
        
        if (existingRoute) {
          // Delete existing inputs
          await RouteInput.destroy({
            where: { route_id: existingRoute.id }
          });
          
          // Create new inputs
          for (const input of insumos) {
            if (!input.codigo_produto_insumo || !input.quantidade_utilizada) {
              results.errors.push(`Invalid input data for route ${item.codigo_produto_final}`);
              continue;
            }
            
            const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
            
            if (!inputProduct) {
              results.errors.push(`Input product ${input.codigo_produto_insumo} not found for route ${item.codigo_produto_final}`);
              continue;
            }
            
            await RouteInput.create({
              route_id: existingRoute.id,
              codigo_produto_insumo: input.codigo_produto_insumo,
              quantidade_utilizada: input.quantidade_utilizada
            });
          }
          
          results.updated++;
        } else {
          // Create new route
          const newRoute = await ProductionRoute.create({
            codigo_produto_final: item.codigo_produto_final
          });
          
          // Create inputs
          for (const input of insumos) {
            if (!input.codigo_produto_insumo || !input.quantidade_utilizada) {
              results.errors.push(`Invalid input data for route ${item.codigo_produto_final}`);
              continue;
            }
            
            const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
            
            if (!inputProduct) {
              results.errors.push(`Input product ${input.codigo_produto_insumo} not found for route ${item.codigo_produto_final}`);
              continue;
            }
            
            await RouteInput.create({
              route_id: newRoute.id,
              codigo_produto_insumo: input.codigo_produto_insumo,
              quantidade_utilizada: input.quantidade_utilizada
            });
          }
          
          results.created++;
        }
      } catch (error) {
        console.error(`Error importing route ${item.codigo_produto_final}:`, error);
        results.errors.push(`Error importing route ${item.codigo_produto_final}: ${error.message}`);
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Production routes imported successfully',
      results
    });
  } catch (error) {
    console.error('Error importing production routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;