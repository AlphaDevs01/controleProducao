import express from 'express';
import { db } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Product, ProductionRoute, Production } = db;

// Get dashboard summary
router.get('/', async (req, res) => {
  try {
    // Count total products
    const totalProducts = await Product.count();
    
    // Count total routes
    const totalRoutes = await ProductionRoute.count();
    
    // Count low stock items (less than 10)
    const lowStockItems = await Product.count({
      where: {
        quantidade_estoque: {
          [Op.lt]: 10,
          [Op.gt]: 0
        }
      }
    });
    
    // Count recent productions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const pendingProductions = await Production.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    res.json({
      totalProducts,
      totalRoutes,
      lowStockItems,
      pendingProductions
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;