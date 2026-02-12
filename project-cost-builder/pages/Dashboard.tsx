import React from 'react';
import { useApp } from '../context/AppContext';
import { FolderKanban, Package, DollarSign } from 'lucide-react';

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
    <div className={`p-3 rounded-full ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { state } = useApp();

  const totalProjects = state.projects.length;
  const totalProducts = state.products.length;
  
  const totalValueProjects = state.projects.reduce((acc, proj) => {
    return acc + proj.routes.reduce((rAcc, r) => {
      return rAcc + r.items.reduce((iAcc, i) => iAcc + i.totalCalculado, 0);
    }, 0);
  }, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Projetos Ativos" 
          value={totalProjects} 
          icon={<FolderKanban size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Produtos Cadastrados" 
          value={totalProducts} 
          icon={<Package size={24} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Valor Total em Projetos" 
          value={`R$ ${totalValueProjects.toFixed(2)}`} 
          icon={<DollarSign size={24} />} 
          color="bg-amber-500" 
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Projetos Recentes</h3>
        {state.projects.length === 0 ? (
          <p className="text-slate-500 italic">Nenhum projeto cadastrado.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 text-sm">
                <tr>
                  <th className="p-4 font-semibold border-b">Nome</th>
                  <th className="p-4 font-semibold border-b">Data Criação</th>
                  <th className="p-4 font-semibold border-b text-right">Rotas</th>
                </tr>
              </thead>
              <tbody>
                {state.projects.slice(-5).reverse().map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4 border-b text-slate-800 font-medium">{p.name}</td>
                    <td className="p-4 border-b text-slate-500 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 border-b text-right text-slate-600">{p.routes.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;