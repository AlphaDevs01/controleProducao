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

// Salvar ordem de produção (equipamentos planejados)
router.post('/save-order', async (req, res) => {
  try {
    const { plans } = req.body; // [{codigo_produto, descricao_produto, quantidade, ordem_producao}]
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ message: 'Nenhum plano enviado' });
    }
    // Limpa produções planejadas antigas (opcional: pode ser por status, por data, etc)
    // await Production.destroy({ where: { status: 'planned' } });

    // Salva cada item na ordem recebida
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      await Production.create({
        codigo_produto: plan.codigo_produto,
        quantidade_produzida: plan.quantidade,
        ordem_producao: plan.ordem_producao,
        status: 'planned',
        ordem: i // campo opcional para facilitar ordenação
      });
    }
    res.json({ message: 'Ordem de produção salva com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar ordem de produção:', error);
    res.status(500).json({ message: 'Erro ao salvar ordem de produção' });
  }
});

// Calculate production requirements for multiple products
router.post('/calculate-multiple', async (req, res) => {
  try {
    const { planos } = req.body;
    if (!Array.isArray(planos) || planos.length === 0) {
      return res.status(400).json({ message: 'Nenhum plano enviado' });
    }
    // Simula estoque para priorizar consumo conforme ordem dos planos
    const estoqueSimulado = {};
    const allProducts = await Product.findAll();
    allProducts.forEach(p => {
      estoqueSimulado[p.codigo] = p.quantidade_estoque;
    });

    const results = [];
    for (const plano of planos) {
      const { codigo_produto, quantidade } = plano;
      if (!codigo_produto || !quantidade || quantidade <= 0) {
        results.push({
          codigo_produto: codigo_produto || '',
          descricao_produto: '',
          quantidade_a_produzir: quantidade || 0,
          insumos: [],
          erro: 'Código ou quantidade inválida'
        });
        continue;
      }
      const product = allProducts.find(p => p.codigo === codigo_produto);
      if (!product) {
        results.push({
          codigo_produto,
          descricao_produto: '',
          quantidade_a_produzir: quantidade,
          insumos: [],
          erro: 'Produto não encontrado'
        });
        continue;
      }
      const route = await ProductionRoute.findOne({
        where: { codigo_produto_final: codigo_produto },
        include: [{ model: RouteInput, as: 'insumos' }]
      });
      if (!route) {
        results.push({
          codigo_produto,
          descricao_produto: product.descricao,
          quantidade_a_produzir: quantidade,
          insumos: [],
          erro: 'Rota de produção não encontrada'
        });
        continue;
      }
      const inputRequirements = [];
      let podeProduzir = true;
      // Primeiro, calcula status de cada insumo com base no estoque simulado atual
      for (const input of route.insumos) {
        const inputProduct = allProducts.find(p => p.codigo === input.codigo_produto_insumo);
        const requiredQuantity = input.quantidade_utilizada * quantidade;
        let status = 'available';
        let estoqueAtual = inputProduct ? estoqueSimulado[input.codigo_produto_insumo] : 0;
        if (!inputProduct || estoqueAtual === 0) {
          status = 'unavailable';
          podeProduzir = false;
        } else if (estoqueAtual < requiredQuantity) {
          status = 'insufficient';
          podeProduzir = false;
        }
        inputRequirements.push({
          codigo_produto_insumo: input.codigo_produto_insumo,
          descricao_insumo: inputProduct ? inputProduct.descricao : '',
          quantidade_necessaria: requiredQuantity,
          quantidade_estoque: estoqueAtual,
          status
        });
      }
      // Se pode produzir, consome do estoque simulado
      if (podeProduzir) {
        for (const input of route.insumos) {
          estoqueSimulado[input.codigo_produto_insumo] -= input.quantidade_utilizada * quantidade;
        }
      } else {
        // Mesmo que não possa produzir, consome parcialmente o estoque dos insumos que ainda têm estoque, para refletir corretamente a prioridade dos próximos
        for (let i = 0; i < route.insumos.length; i++) {
          const input = route.insumos[i];
          const reqQty = input.quantidade_utilizada * quantidade;
          const estoqueAtual = estoqueSimulado[input.codigo_produto_insumo] || 0;
          if (estoqueAtual > 0) {
            estoqueSimulado[input.codigo_produto_insumo] = Math.max(estoqueAtual - reqQty, 0);
          }
        }
      }
      results.push({
        codigo_produto: product.codigo,
        descricao_produto: product.descricao,
        quantidade_a_produzir: parseInt(quantidade),
        insumos: inputRequirements
      });
    }
    res.json(results);
  } catch (error) {
    console.error('Error calculating production in batch:', error);
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