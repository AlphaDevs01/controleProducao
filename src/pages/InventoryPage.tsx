import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { PackagePlus, Upload, Plus, Search, Edit, Truck, RotateCcw } from 'lucide-react';
import { API_URL } from '../config';
import InventoryUpdateModal from '../components/InventoryUpdateModal';
import FileUploadModal from '../components/FileUploadModal';
import ConfirmModal from '../components/ConfirmModal';

interface Product {
  codigo: string;
  descricao: string;
  familia: string | null;
  quantidade_estoque: number;
}

const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInventory = (product: Product | null) => {
    setCurrentProduct(product);
    setIsUpdateModalOpen(true);
  };

  const handleResetInventory = async () => {
    try {
      await axios.post(`${API_URL}/inventory/reset`);
      toast.success('Inventory reset successfully');
      fetchProducts();
      setIsResetModalOpen(false);
    } catch (error) {
      console.error('Error resetting inventory:', error);
      toast.error('Failed to reset inventory');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.familia && product.familia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center">
            <PackagePlus className="mr-2" size={28} />
            Estoque
          </h1>
          <p className="text-slate-600">Gerencie o estoque dos seus produtos</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <RotateCcw size={18} />
            Resetar Estoque
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
          >
            <Upload size={18} />
            Importar Estoque
          </button>
          <button
            onClick={() => handleUpdateInventory(null)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Atualizar Estoque
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
              placeholder="Busque produtos por código, descrição ou família..."
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
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Família
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.codigo} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.familia || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.quantidade_estoque <= 0 
                            ? 'bg-red-100 text-red-800' 
                            : product.quantidade_estoque < 10 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {product.quantidade_estoque}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleUpdateInventory(product)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentProduct(product);
                            setIsUpdateModalOpen(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Truck size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isUpdateModalOpen && (
        <InventoryUpdateModal
          product={currentProduct}
          onClose={() => setIsUpdateModalOpen(false)}
          onSave={() => {
            fetchProducts();
            setIsUpdateModalOpen(false);
          }}
        />
      )}

      {isUploadModalOpen && (
        <FileUploadModal
          title="Import Inventory"
          endpoint={`${API_URL}/inventory/import`}
          templateFields={['codigo', 'quantidade_estoque']}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            fetchProducts();
            setIsUploadModalOpen(false);
          }}
        />
      )}

      {isResetModalOpen && (
        <ConfirmModal
          title="Resetar Estoque"
          message="Tem certeza que deseja zerar todo o estoque? Esta ação não pode ser desfeita."
          confirmText="Resetar Estoque"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleResetInventory}
          onCancel={() => setIsResetModalOpen(false)}
        />
      )}
    </div>
  );
};

export default InventoryPage;