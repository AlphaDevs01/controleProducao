import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Factory, Search, FileDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { API_URL } from '../config';
import * as XLSX from 'xlsx';

interface Product {
  codigo: string;
  descricao: string;
}

interface ProductInput {
  codigo_produto_insumo: string;
  descricao_insumo: string;
  quantidade_necessaria: number;
  quantidade_estoque: number;
  status: 'available' | 'insufficient' | 'unavailable';
}

interface ProductionPlan {
  codigo_produto: string;
  descricao_produto: string;
  quantidade_a_produzir: number;
  insumos: ProductInput[];
}

const ProductionPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productionQuantity, setProductionQuantity] = useState<number>(1);
  const [productionPlan, setProductionPlan] = useState<ProductionPlan | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length >= 2) {
      const filtered = products.filter(
        product =>
          product.codigo.toLowerCase().includes(term.toLowerCase()) ||
          product.descricao.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearchDropdownOpen(true);
    } else {
      setIsSearchDropdownOpen(false);
    }
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(`${product.codigo} - ${product.descricao}`);
    setIsSearchDropdownOpen(false);
    setProductionPlan(null); // Reset production plan when product changes
  };

  const calculateProduction = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    
    if (productionQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    try {
      setCalculationLoading(true);
      const response = await axios.post(`${API_URL}/production/calculate`, {
        codigo_produto: selectedProduct.codigo,
        quantidade: productionQuantity
      });
      setProductionPlan(response.data);
    } catch (error: any) {
      console.error('Error calculating production:', error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to calculate production');
      }
    } finally {
      setCalculationLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!productionPlan) return;

    // Create worksheet with production details
    const ws = XLSX.utils.json_to_sheet([
      {
        'Product Code': productionPlan.codigo_produto,
        'Product Description': productionPlan.descricao_produto,
        'Quantity to Produce': productionPlan.quantidade_a_produzir
      }
    ]);

    // Add some empty rows
    XLSX.utils.sheet_add_json(ws, [{}], { origin: 'A3' });

    // Add inputs table headers
    XLSX.utils.sheet_add_json(
      ws,
      [
        {
          'Input Code': 'Input Code',
          'Input Description': 'Input Description',
          'Required Quantity': 'Required Quantity',
          'Available Stock': 'Available Stock',
          'Status': 'Status',
          'Missing Quantity': 'Missing Quantity'
        }
      ],
      { origin: 'A4' }
    );

    // Add inputs data
    const inputsData = productionPlan.insumos.map(insumo => ({
      'Input Code': insumo.codigo_produto_insumo,
      'Input Description': insumo.descricao_insumo,
      'Required Quantity': insumo.quantidade_necessaria,
      'Available Stock': insumo.quantidade_estoque,
      'Status': insumo.status === 'available' 
        ? 'Available' 
        : insumo.status === 'insufficient' 
          ? 'Insufficient' 
          : 'Unavailable',
      'Missing Quantity': insumo.status !== 'available' 
        ? Math.max(0, insumo.quantidade_necessaria - insumo.quantidade_estoque)
        : 0
    }));

    XLSX.utils.sheet_add_json(ws, inputsData, { origin: 'A5', skipHeader: true });

    // Create workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Plan');

    // Generate file name based on product and date
    const fileName = `Production_${productionPlan.codigo_produto}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write the file
    XLSX.writeFile(wb, fileName);
  };

  const canProduce = productionPlan && productionPlan.insumos.every(insumo => insumo.status === 'available');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center">
          <Factory className="mr-2" size={28} />
          Planejamento de Produção
        </h1>
        <p className="text-slate-600">Calcule os materiais necessários para a produção</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Parâmetros de Produção</h2>
            
            <div className="mb-6">
              <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                Produto para Produzir*
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Busque por produtos"
                />
                
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
            </div>
            
            <div className="mb-6">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade para Produzir*
              </label>
              <input
                type="number"
                id="quantity"
                value={productionQuantity}
                onChange={(e) => setProductionQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                min="1"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite a quantidade"
              />
            </div>
            
            <button
              onClick={calculateProduction}
              disabled={!selectedProduct || productionQuantity <= 0 || calculationLoading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white ${
                !selectedProduct || productionQuantity <= 0 || calculationLoading
                  ? 'bg-blue-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {calculationLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                    <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculando...
                </>
              ) : (
                <>
                  <Factory size={18} />
                  Calcular Produção
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {productionPlan ? (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">
                    Resultado do Planejamento
                  </h2>
                  <button
                    onClick={exportToExcel}
                    className="mt-2 sm:mt-0 flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <FileDown size={16} />
                    Exportar para Excel
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Produto:</p>
                      <p className="font-medium">{productionPlan.codigo_produto} - {productionPlan.descricao_produto}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantidade a Produzir:</p>
                      <p className="font-medium">{productionPlan.quantidade_a_produzir}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status:</p>
                      {canProduce ? (
                        <p className="font-medium text-green-600 flex items-center">
                          <CheckCircle size={16} className="mr-1" />
                          Pronto para produzir
                        </p>
                      ) : (
                        <p className="font-medium text-red-600 flex items-center">
                          <AlertTriangle size={16} className="mr-1" />
                          Faltam materiais
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Materiais Necessários</h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Necessário
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Disponível
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productionPlan.insumos.map((insumo, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{insumo.codigo_produto_insumo}</div>
                            <div className="text-sm text-gray-500">{insumo.descricao_insumo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {insumo.quantidade_necessaria}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {insumo.quantidade_estoque}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {insumo.status === 'available' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center w-fit">
                                <CheckCircle size={12} className="mr-1" />
                                Disponível
                              </span>
                            ) : insumo.status === 'insufficient' ? (
                              <div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center w-fit">
                                  <AlertTriangle size={12} className="mr-1" />
                                  Insuficiente
                                </span>
                                <span className="text-xs text-red-600 mt-1">
                                  Faltando: {insumo.quantidade_necessaria - insumo.quantidade_estoque}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center w-fit">
                                  <XCircle size={12} className="mr-1" />
                                  Indisponível
                                </span>
                                <span className="text-xs text-red-600 mt-1">
                                  Faltando: {insumo.quantidade_necessaria}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <Factory size={64} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-500">Nenhum Planejamento</h3>
              <p className="text-gray-400 text-center mt-2">
                Selecione um produto e informe a quantidade para calcular os materiais necessários
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionPage;