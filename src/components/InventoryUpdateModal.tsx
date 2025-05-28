import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, Search } from 'lucide-react';
import { API_URL } from '../config';

interface Product {
  codigo: string;
  descricao: string;
  familia: string | null;
  quantidade_estoque: number;
}

interface InventoryUpdateModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

const InventoryUpdateModal: React.FC<InventoryUpdateModalProps> = ({ product, onClose, onSave }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(product);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
      setSearchTerm(`${product.codigo} - ${product.descricao}`);
    }
  }, [product]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length >= 2) {
      try {
        const response = await axios.get(`${API_URL}/products/search?term=${term}`);
        setSearchResults(response.data);
        setIsSearchDropdownOpen(true);
      } catch (error) {
        console.error('Error searching products:', error);
      }
    } else {
      setIsSearchDropdownOpen(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(`${product.codigo} - ${product.descricao}`);
    setIsSearchDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }
    
    if (quantity === 0) {
      toast.error('Informe uma quantidade');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post(`${API_URL}/inventory/update`, {
        codigo: selectedProduct.codigo,
        quantidade: quantity
      });
      toast.success('Estoque atualizado com sucesso');
      onSave();
    } catch (error: any) {
      console.error('Error updating inventory:', error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Falha ao atualizar estoque');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">
            Atualizar Estoque
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 relative">
            <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
              Produto*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="product"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Busque por código ou descrição"
                disabled={!!product} // Disable when editing specific product
              />
            </div>
            
            {isSearchDropdownOpen && (
              <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                {searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <li
                      key={product.codigo}
                      onClick={() => selectProduct(product)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900 truncate">
                          {product.codigo}
                        </span>
                        <span className="text-gray-500 ml-2 truncate">
                          {product.descricao}
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="cursor-default select-none relative py-2 pl-3 pr-9">
                    Nenhum produto encontrado
                  </li>
                )}
              </ul>
            )}
          </div>
          
          {selectedProduct && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estoque atual:</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProduct.quantidade_estoque}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedProduct.quantidade_estoque <= 0 
                    ? 'bg-red-100 text-red-800' 
                    : selectedProduct.quantidade_estoque < 10 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-green-100 text-green-800'
                }`}>
                  {selectedProduct.quantidade_estoque <= 0 ? 'Sem estoque' : 
                   selectedProduct.quantidade_estoque < 10 ? 'Estoque baixo' : 'Em estoque'}
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade para Adicionar/Remover*
            </label>
            <div className="flex">
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informe a quantidade (negativo para remover)"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use números positivos para adicionar, negativos para remover
            </p>
          </div>
          
          {selectedProduct && quantity !== 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Novo estoque será: <span className="font-bold">{selectedProduct.quantidade_estoque + quantity}</span>
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProduct || quantity === 0}
              className={`px-4 py-2 rounded-md text-white ${
                loading || !selectedProduct || quantity === 0 ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {loading ? 'Atualizando...' : 'Atualizar Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryUpdateModal;