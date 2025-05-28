import express from 'express';
import { db } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Product, ProductionRoute, RouteInput, Production } = db;

// Calculate production requirements
router.post('/calculate', async (req, res) => {
  try {
    const { codigo_produto, quantidade } = req.body;
    
    // Validate input
    if (!codigo_produto) {
      return res.status(400).json({ message: 'Product code is required' });
    }
    
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ message: 'A valid quantity is required' });
    }
    
    // Check if product exists
    const product = await Product.findByPk(codigo_produto);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find production route
    const route = await ProductionRoute.findOne({
      where: { codigo_produto_final: codigo_produto },
      include: [{ model: RouteInput, as: 'insumos' }]
    });
    
    if (!route) {
      return res.status(404).json({ message: 'No production route found for this product' });
    }
    
    // Calculate required inputs
    const inputRequirements = [];
    
    for (const input of route.insumos) {
      // Find input product
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      
      if (!inputProduct) {
        return res.status(404).json({ 
          message: `Input product ${input.codigo_produto_insumo} not found` 
        });
      }
      
      // Calculate required quantity
      const requiredQuantity = input.quantidade_utilizada * quantidade;
      
      // Determine status
      let status = 'available';
      if (inputProduct.quantidade_estoque === 0) {
        status = 'unavailable';
      } else if (inputProduct.quantidade_estoque < requiredQuantity) {
        status = 'insufficient';
      }
      
      inputRequirements.push({
        codigo_produto_insumo: input.codigo_produto_insumo,
        descricao_insumo: inputProduct.descricao,
        quantidade_necessaria: requiredQuantity,
        quantidade_estoque: inputProduct.quantidade_estoque,
        status
      });
    }
    
    // Return production plan
    const productionPlan = {
      codigo_produto: product.codigo,
      descricao_produto: product.descricao,
      quantidade_a_produzir: parseInt(quantidade),
      insumos: inputRequirements
    };
    
    res.json(productionPlan);
  } catch (error) {
    console.error('Error calculating production:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Execute production (update inventory)
router.post('/execute', async (req, res) => {
  try {
    const { codigo_produto, quantidade } = req.body;
    
    // Validate input
    if (!codigo_produto) {
      return res.status(400).json({ message: 'Product code is required' });
    }
    
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ message: 'A valid quantity is required' });
    }
    
    // Check if product exists
    const product = await Product.findByPk(codigo_produto);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find production route
    const route = await ProductionRoute.findOne({
      where: { codigo_produto_final: codigo_produto },
      include: [{ model: RouteInput, as: 'insumos' }]
    });
    
    if (!route) {
      return res.status(404).json({ message: 'No production route found for this product' });
    }
    
    // Check if we have enough materials
    for (const input of route.insumos) {
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      
      if (!inputProduct) {
        return res.status(404).json({ 
          message: `Input product ${input.codigo_produto_insumo} not found` 
        });
      }
      
      const requiredQuantity = input.quantidade_utilizada * quantidade;
      
      if (inputProduct.quantidade_estoque < requiredQuantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${input.codigo_produto_insumo}: needed ${requiredQuantity}, have ${inputProduct.quantidade_estoque}` 
        });
      }
    }
    
    // Update inventory for inputs
    for (const input of route.insumos) {
      const inputProduct = await Product.findByPk(input.codigo_produto_insumo);
      const requiredQuantity = input.quantidade_utilizada * quantidade;
      
      await inputProduct.update({
        quantidade_estoque: inputProduct.quantidade_estoque - requiredQuantity
      });
    }
    
    // Update inventory for final product
    await product.update({
      quantidade_estoque: product.quantidade_estoque + parseInt(quantidade)
    });
    
    // Record production
    await Production.create({
      codigo_produto,
      quantidade_produzida: parseInt(quantidade)
    });
    
    res.json({
      message: 'Production executed successfully',
      product: {
        codigo: product.codigo,
        descricao: product.descricao,
        quantidade_estoque: product.quantidade_estoque
      }
    });
  } catch (error) {
    console.error('Error executing production:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get production history
router.get('/history', async (req, res) => {
  try {
    const productions = await Production.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    // Enrich with product details
    const enrichedProductions = await Promise.all(productions.map(async (production) => {
      const product = await Product.findByPk(production.codigo_produto);
      
      return {
        id: production.id,
        codigo_produto: production.codigo_produto,
        descricao_produto: product ? product.descricao : null,
        quantidade_produzida: production.quantidade_produzida,
        data_producao: production.data_producao
      };
    }));
    
    res.json(enrichedProductions);
  } catch (error) {
    console.error('Error fetching production history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;