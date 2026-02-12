import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Package, Settings, GitFork, Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Layout: React.FC = () => {
  const { saveStatus } = useApp();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent/10 text-accent border-r-4 border-accent'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    }`;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col shadow-lg">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">Cost Builder</h1>
          <p className="text-xs text-slate-400 mt-1">v1.0.0 • Offline</p>
        </div>
        
        <nav className="flex-1 py-4">
          <NavLink to="/" className={navClass}>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={navClass}>
            <FolderKanban size={20} />
            Projetos
          </NavLink>
          <NavLink to="/products" className={navClass}>
            <Package size={20} />
            Produtos (Global)
          </NavLink>
          <NavLink to="/route-templates" className={navClass}>
            <GitFork size={20} />
            Banco de Rotas
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings size={20} />
            Configurações
          </NavLink>
        </nav>

        {/* Status Indicator */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex items-center gap-3 text-xs font-medium">
                {saveStatus === 'idle' && (
                    <>
                        <Cloud size={16} className="text-slate-400" />
                        <span className="text-slate-400">Aguardando...</span>
                    </>
                )}
                {saveStatus === 'saving' && (
                    <>
                        <RefreshCw size={16} className="text-blue-400 animate-spin" />
                        <span className="text-blue-400">Salvando...</span>
                    </>
                )}
                {saveStatus === 'saved' && (
                    <>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-emerald-400">Salvo na Nuvem</span>
                    </>
                )}
                {saveStatus === 'error' && (
                    <>
                        <CloudOff size={16} className="text-red-400" />
                        <span className="text-red-400">Erro ao Salvar</span>
                    </>
                )}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 pl-7">
                Não feche enquanto salva.
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 min-h-full">
           <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;