import { Sequelize, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dbDir, 'database.sqlite'),
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Define Product model
const Product = sequelize.define('Product', {
  codigo: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  descricao: {
    type: DataTypes.STRING,
    allowNull: false
  },
  familia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quantidade_estoque: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

// Define ProductionRoute model
const ProductionRoute = sequelize.define('ProductionRoute', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  codigo_produto_final: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Product,
      key: 'codigo'
    }
  }
});

// Define RouteInput model
const RouteInput = sequelize.define('RouteInput', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  codigo_produto_insumo: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Product,
      key: 'codigo'
    }
  },
  quantidade_utilizada: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
});

// Define Production model (for tracking production history)
const Production = sequelize.define('Production', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  codigo_produto: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Product,
      key: 'codigo'
    }
  },
  quantidade_produzida: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ordem_producao: { // Novo campo para OF*
    type: DataTypes.STRING,
    allowNull: true
  },
  status: { // Novo campo para status do planejamento
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'planned'
  },
  ordem: { // Novo campo para ordem de prioridade
    type: DataTypes.INTEGER,
    allowNull: true
  },
  data_producao: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Define relationships
ProductionRoute.hasMany(RouteInput, { foreignKey: 'route_id', as: 'insumos' });
RouteInput.belongsTo(ProductionRoute, { foreignKey: 'route_id' });
RouteInput.belongsTo(Product, { foreignKey: 'codigo_produto_insumo', as: 'product' });

// Export models
export const db = {
  sequelize,
  User,
  Product,
  ProductionRoute,
  RouteInput,
  Production
};

// Initialize database
export const initDatabase = async () => {
  try {
    // Sync all models with database
    await sequelize.sync();
    console.log('Database synchronized successfully');
    
    // Check if admin user exists, create if not
    const adminCount = await User.count();
    if (adminCount === 0) {
      await User.create({
        email: 'admin@example.com',
        password: 'admin123'
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connection established successfully'))
  .catch(err => console.error('Unable to connect to the database:', err));