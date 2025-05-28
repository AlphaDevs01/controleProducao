import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Package2, Truck, GitMerge, AlertCircle } from 'lucide-react';

interface DashboardSummary {
  totalProducts: number;
  totalRoutes: number;
  lowStockItems: number;
  pendingProductions: number;
}

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalProducts: 0,
    totalRoutes: 0,
    lowStockItems: 0,
    pendingProductions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard`);
        setSummary(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const cards = [
    {
      title: 'Total de Produtos',
      value: summary.totalProducts,
      icon: <Package2 size={24} className="text-blue-500" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      link: '/products'
    },
    {
      title: 'Rotas de Produção',
      value: summary.totalRoutes,
      icon: <GitMerge size={24} className="text-indigo-500" />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      link: '/routes'
    },
    {
      title: 'Itens com Baixo Estoque',
      value: summary.lowStockItems,
      icon: <AlertCircle size={24} className="text-amber-500" />,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      link: '/inventory'
    },
    {
      title: 'Planos de Produção',
      value: summary.pendingProductions,
      icon: <Truck size={24} className="text-green-500" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      link: '/production'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600">Visão geral do seu sistema de produção</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => (
              <a 
                key={index} 
                href={card.link}
                className={`${card.bgColor} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{card.title}</p>
                    <p className={`text-3xl font-bold ${card.textColor} mt-2`}>{card.value}</p>
                  </div>
                  <div className="p-3 rounded-full bg-white shadow-sm">
                    {card.icon}
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Atividade Recente</h2>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  <li className="py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Package2 size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Novo produto adicionado</p>
                        <p className="text-xs text-slate-500">PROD001 - Container Industrial</p>
                      </div>
                      <span className="ml-auto text-xs text-slate-500">2 horas atrás</span>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Truck size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Produção concluída</p>
                        <p className="text-xs text-slate-500">10 unidades de PROD005</p>
                      </div>
                      <span className="ml-auto text-xs text-slate-500">Ontem</span>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-2 rounded-full mr-3">
                        <AlertCircle size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Alerta de baixo estoque</p>
                        <p className="text-xs text-slate-500">INS002 - Chapas de Aço</p>
                      </div>
                      <span className="ml-auto text-xs text-slate-500">2 dias atrás</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="/products"
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-300"
                >
                  <Package2 size={24} className="text-slate-700 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Adicionar Produto</span>
                </a>
                <a
                  href="/routes"
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-300"
                >
                  <GitMerge size={24} className="text-slate-700 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Criar Rota</span>
                </a>
                <a
                  href="/inventory"
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-300"
                >
                  <Truck size={24} className="text-slate-700 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Atualizar Estoque</span>
                </a>
                <a
                  href="/production"
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors duration-300"
                >
                  <Package2 size={24} className="text-slate-700 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Planejar Produção</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;