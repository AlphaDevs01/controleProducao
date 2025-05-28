import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GitMerge, Upload, Plus, Search, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '../config';
import RouteModal from '../components/RouteModal';
import FileUploadModal from '../components/FileUploadModal';

interface ProductInput {
  codigo_produto_insumo: string;
  quantidade_utilizada: number;
  descricao_insumo?: string;
}

interface ProductionRoute {
  id: number;
  codigo_produto_final: string;
  descricao_produto_final?: string;
  insumos: ProductInput[];
}

const RoutesPage: React.FC = () => {
  const [routes, setRoutes] = useState<ProductionRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<ProductionRoute | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<number[]>([]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/routes`);
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to fetch production routes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEdit = (route: ProductionRoute | null) => {
    setCurrentRoute(route);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this production route?')) {
      try {
        await axios.delete(`${API_URL}/routes/${id}`);
        toast.success('Production route deleted successfully');
        fetchRoutes();
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error('Failed to delete production route');
      }
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleRouteExpanded = (id: number) => {
    if (expandedRoutes.includes(id)) {
      setExpandedRoutes(expandedRoutes.filter(routeId => routeId !== id));
    } else {
      setExpandedRoutes([...expandedRoutes, id]);
    }
  };

  const filteredRoutes = routes.filter(
    (route) =>
      route.codigo_produto_final.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.descricao_produto_final && route.descricao_produto_final.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            <GitMerge className="mr-2" size={28} />
            Rotas de Produção
          </h1>
          <p className="text-slate-600">Gerencie seu processo produtivo e insumos necessários</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
          >
            <Upload size={18} />
            Importar Rotas
          </button>
          <button
            onClick={() => handleAddEdit(null)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Adicionar Rota
          </button>
        </div>
      </header>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Busque rotas por código ou descrição do produto..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código do Produto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insumos
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((route) => (
                    <React.Fragment key={route.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRouteExpanded(route.id)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {route.codigo_produto_final}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {route.descricao_produto_final || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {route.insumos.length} insumo{route.insumos.length !== 1 ? 's' : ''}
                            </span>
                            {expandedRoutes.includes(route.id) ? (
                              <ChevronUp size={16} className="ml-2 text-gray-500" />
                            ) : (
                              <ChevronDown size={16} className="ml-2 text-gray-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddEdit(route);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(route.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                      {expandedRoutes.includes(route.id) && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-gray-50">
                            <div className="text-sm text-gray-700">
                              <h3 className="font-medium mb-2">Insumos:</h3>
                              <table className="min-w-full divide-y divide-gray-200 border rounded-md">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Código
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Descrição
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Quantidade
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {route.insumos.map((insumo, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                        {insumo.codigo_produto_insumo}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {insumo.descricao_insumo || '-'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-xs text-right text-gray-900">
                                        {insumo.quantidade_utilizada}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhuma rota de produção encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RouteModal
          route={currentRoute}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            fetchRoutes();
            setIsModalOpen(false);
          }}
        />
      )}

      {isUploadModalOpen && (
        <FileUploadModal
          title="Import Production Routes"
          endpoint={`${API_URL}/routes/import`}
          templateFields={['codigo_produto_final', 'insumos']}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            fetchRoutes();
            setIsUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default RoutesPage;