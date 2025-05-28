import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import { API_URL } from '../config';

interface Product {
  codigo: string;
  descricao: string;
  familia: string | null;
  quantidade_estoque: number;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState<Product>({
    codigo: '',
    descricao: '',
    familia: '',
    quantidade_estoque: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantidade_estoque' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.descricao) {
      toast.error('Product code and description are required');
      return;
    }
    
    try {
      setLoading(true);
      if (product) {
        // Update existing product
        await axios.put(`${API_URL}/products/${product.codigo}`, formData);
        toast.success('Product updated successfully');
      } else {
        // Create new product
        await axios.post(`${API_URL}/products`, formData);
        toast.success('Product created successfully');
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to save product');
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
            {product ? 'Editar Produto' : 'Adicionar Novo Produto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
              Código do Produto*
            </label>
            <input
              type="text"
              id="codigo"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o código do produto"
              required
              disabled={!!product} // Disable editing of product code for existing products
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição*
            </label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite a descrição do produto"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="familia" className="block text-sm font-medium text-gray-700 mb-1">
              Família
            </label>
            <input
              type="text"
              id="familia"
              name="familia"
              value={formData.familia || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite a família do produto (opcional)"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="quantidade_estoque" className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade em Estoque
            </label>
            <input
              type="number"
              id="quantidade_estoque"
              name="quantidade_estoque"
              value={formData.quantidade_estoque}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite a quantidade em estoque"
            />
          </div>
          
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
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;