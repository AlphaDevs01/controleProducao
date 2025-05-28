import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, Plus, Trash2, Search, Upload } from 'lucide-react';
import { API_URL } from '../config';
import * as XLSX from 'xlsx';

interface Product {
  codigo: string;
  descricao: string;
}

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

interface RouteModalProps {
  route: ProductionRoute | null;
  onClose: () => void;
  onSave: () => void;
}

const RouteModal: React.FC<RouteModalProps> = ({ route, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<ProductionRoute, 'id'>>({
    codigo_produto_final: '',
    descricao_produto_final: '',
    insumos: []
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [newInput, setNewInput] = useState<ProductInput>({
    codigo_produto_insumo: '',
    quantidade_utilizada: 1
  });
  const [searchInputProduct, setSearchInputProduct] = useState('');
  const [searchInputResults, setSearchInputResults] = useState<Product[]>([]);
  const [isInputDropdownOpen, setIsInputDropdownOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchProducts();
    
    if (route) {
      setFormData({
        codigo_produto_final: route.codigo_produto_final,
        descricao_produto_final: route.descricao_produto_final,
        insumos: [...route.insumos]
      });
    }
  }, [route]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Falha ao buscar produtos');
    }
  };

  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchProduct(term);
    
    if (term.length > 2) {
      const filtered = products.filter(
        product =>
          product.codigo.toLowerCase().includes(term.toLowerCase()) ||
          product.descricao.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
      setIsProductDropdownOpen(true);
    } else {
      setIsProductDropdownOpen(false);
    }
  };

  const handleInputProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchInputProduct(term);
    
    if (term.length > 2) {
      const filtered = products.filter(
        product =>
          product.codigo.toLowerCase().includes(term.toLowerCase()) ||
          product.descricao.toLowerCase().includes(term.toLowerCase())
      );
      setSearchInputResults(filtered);
      setIsInputDropdownOpen(true);
    } else {
      setIsInputDropdownOpen(false);
    }
  };

  const selectProduct = (product: Product) => {
    setFormData({
      ...formData,
      codigo_produto_final: product.codigo,
      descricao_produto_final: product.descricao
    });
    setSearchProduct(`${product.codigo} - ${product.descricao}`);
    setIsProductDropdownOpen(false);
  };

  const selectInputProduct = (product: Product) => {
    setNewInput({
      ...newInput,
      codigo_produto_insumo: product.codigo
    });
    setSearchInputProduct(`${product.codigo} - ${product.descricao}`);
    setIsInputDropdownOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'quantidade_utilizada') {
      setNewInput({
        ...newInput,
        quantidade_utilizada: Number(value)
      });
    }
  };

  const addInput = () => {
    if (!newInput.codigo_produto_insumo) {
      toast.error('Selecione um insumo');
      return;
    }
    
    if (newInput.quantidade_utilizada <= 0) {
      toast.error('A quantidade deve ser maior que 0');
      return;
    }
    
    if (formData.insumos.some(i => i.codigo_produto_insumo === newInput.codigo_produto_insumo)) {
      toast.error('Este produto já está na lista de insumos');
      return;
    }
    
    // Find product description
    const product = products.find(p => p.codigo === newInput.codigo_produto_insumo);
    
    setFormData({
      ...formData,
      insumos: [
        ...formData.insumos,
        {
          ...newInput,
          descricao_insumo: product?.descricao
        }
      ]
    });
    
    // Reset input form
    setNewInput({
      codigo_produto_insumo: '',
      quantidade_utilizada: 1
    });
    setSearchInputProduct('');
  };

  const removeInput = (index: number) => {
    const updatedInputs = [...formData.insumos];
    updatedInputs.splice(index, 1);
    
    setFormData({
      ...formData,
      insumos: updatedInputs
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo_produto_final) {
      toast.error('Selecione um produto final');
      return;
    }
    
    if (formData.insumos.length === 0) {
      toast.error('Adicione pelo menos um insumo');
      return;
    }
    
    try {
      setLoading(true);
      if (route) {
        // Update existing route
        await axios.put(`${API_URL}/routes/${route.id}`, formData);
        toast.success('Rota de produção atualizada com sucesso');
      } else {
        // Create new route
        await axios.post(`${API_URL}/routes`, formData);
        toast.success('Rota de produção cadastrada com sucesso');
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving route:', error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Falha ao salvar rota de produção');
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para importar insumos via arquivo
  const handleImportInsumos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) return;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData.length) {
            toast.error('Arquivo vazio ou formato inválido.');
            return;
          }

          // Validação dos insumos
          const validInputs: ProductInput[] = [];
          const invalidInputs: any[] = [];
          for (const row of jsonData) {
            const codigo = String(row.codigo_produto_insumo || '').trim();
            const quantidade = Number(row.quantidade_utilizada);
            if (!codigo || !quantidade || quantidade <= 0) {
              invalidInputs.push(row);
              continue;
            }
            // Verifica se existe na lista de produtos
            const product = products.find(p => p.codigo === codigo);
            if (product) {
              validInputs.push({
                codigo_produto_insumo: codigo,
                quantidade_utilizada: quantidade,
                descricao_insumo: product.descricao
              });
            } else {
              invalidInputs.push(row);
            }
          }

          if (validInputs.length) {
            // Evita duplicidade
            const novos = validInputs.filter(
              vi => !formData.insumos.some(i => i.codigo_produto_insumo === vi.codigo_produto_insumo)
            );
            setFormData({
              ...formData,
              insumos: [...formData.insumos, ...novos]
            });
            toast.success(`${novos.length} insumo(s) importado(s) com sucesso`);
          }
          if (invalidInputs.length) {
            toast.warn(`${invalidInputs.length} insumo(s) não encontrados ou inválidos`);
          }
        } catch (err) {
          toast.error('Erro ao processar o arquivo.');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      toast.error('Erro ao importar insumos');
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-slate-800">
            {route ? 'Editar Rota de Produção' : 'Nova Rota de Produção'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">Produto Final</h3>
            <div className="mb-4 relative">
              <label htmlFor="codigo_produto_final" className="block text-sm font-medium text-gray-700 mb-1">
                Produto*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="produto_final"
                  value={searchProduct}
                  onChange={handleProductSearch}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Busque por código ou descrição"
                  disabled={!!route} // Disable editing of final product for existing routes
                />
              </div>
              
              {isProductDropdownOpen && (
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
          </div>
          
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">Insumos</h3>
            <div className="flex items-center mb-2 gap-2">
              <span className="text-sm text-gray-500">Importar insumos via arquivo:</span>
              <label className="flex items-center cursor-pointer text-blue-600 hover:text-blue-800">
                <Upload size={18} className="mr-1" />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleImportInsumos}
                  disabled={importing}
                />
              </label>
            </div>
            
            {formData.insumos.length > 0 ? (
              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border rounded-md">
                  <thead className="bg-gray-50">
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
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.insumos.map((insumo, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {insumo.codigo_produto_insumo}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {insumo.descricao_insumo || '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                          {insumo.quantidade_utilizada}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => removeInput(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-md text-center">
                <p className="text-gray-500">Nenhum insumo adicionado ainda</p>
              </div>
            )}
            
            <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Adicionar Novo Insumo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <label htmlFor="input_product" className="block text-sm font-medium text-gray-700 mb-1">
                    Produto*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="input_product"
                      value={searchInputProduct}
                      onChange={handleInputProductSearch}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Busque por produtos"
                    />
                  </div>
                  
                  {isInputDropdownOpen && (
                    <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                      {searchInputResults.length > 0 ? (
                        searchInputResults.map((product) => (
                          <li
                            key={product.codigo}
                            onClick={() => selectInputProduct(product)}
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
                
                <div>
                  <label htmlFor="quantidade_utilizada" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade*
                  </label>
                  <input
                    type="number"
                    id="quantidade_utilizada"
                    name="quantidade_utilizada"
                    value={newInput.quantidade_utilizada}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Quantidade"
                  />
                </div>
              </div>
              
              <div className="text-right">
                <button
                  type="button"
                  onClick={addInput}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Adicionar Insumo
                </button>
              </div>
            </div>
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
              {loading ? 'Salvando...' : 'Salvar Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteModal;