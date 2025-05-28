import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  PackageOpen, 
  GitMerge, 
  PackagePlus, 
  Factory, 
  LogOut,
  Plus
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <div className="w-64 bg-slate-800 text-white h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center">
          <Factory className="mr-2" size={24} />
          Controle de Produção
        </h1>
        {user && (
          <p className="text-sm text-slate-300 mt-1">
            Bem-vindo, {user.email}
          </p>
        )}
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <NavLink 
              to="/"
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <LayoutDashboard className="mr-3" size={20} />
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/products"
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <PackageOpen className="mr-3" size={20} />
              Produtos
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/routes"
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <GitMerge className="mr-3" size={20} />
              Rotas de Produção
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/inventory"
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <PackagePlus className="mr-3" size={20} />
              Estoque
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/production"
              className={({ isActive }) => 
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <Factory className="mr-3" size={20} />
              Produção
            </NavLink>
          </li>
          {user && (
            <li>
              <NavLink
                to="/admin-register"
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                <Plus className="mr-3" size={20} />
                Registrar Usuário
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center p-3 w-full text-left rounded-lg text-slate-300 hover:bg-slate-700 transition-all"
        >
          <LogOut className="mr-3" size={20} />
          Sair
        </button>
      </div>
    </div>
  );
};

export default Navbar;