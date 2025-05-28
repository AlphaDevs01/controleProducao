import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Factory, Search, FileDown, AlertTriangle, CheckCircle, XCircle, ArrowUp, ArrowDown, Save } from 'lucide-react';
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

interface PlanItem {
  codigo_produto: string;
  descricao_produto: string;
  quantidade: number;
  ordem_producao: string;
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
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [ordemProducao, setOrdemProducao] = useState('');
  const [multiPlansResult, setMultiPlansResult] = useState<ProductionPlan[]>([]);

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

  // Adicionar equipamento ao planejamento com campo OF
  const addPlan = () => {
    if (!selectedProduct || productionQuantity <= 0 || !ordemProducao.trim()) {
      toast.error('Preencha produto, quantidade e ordem de produção (OF*)');
      return;
    }
    if (plans.some(p => p.ordem_producao === ordemProducao.trim())) {
      toast.warn('Já existe um item com essa ordem de produção (OF*)');
      return;
    }
    setPlans(prev => [
      ...prev,
      {
        codigo_produto: selectedProduct.codigo,
        descricao_produto: selectedProduct.descricao,
        quantidade: productionQuantity,
        ordem_producao: ordemProducao.trim()
      }
    ]);
    setSelectedProduct(null);
    setSearchTerm('');
    setProductionQuantity(1);
    setOrdemProducao('');
  };

  // Mover item para cima
  const movePlanUp = (idx: number) => {
    if (idx === 0) return;
    setPlans(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  // Mover item para baixo
  const movePlanDown = (idx: number) => {
    if (idx === plans.length - 1) return;
    setPlans(prev => {
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  // Salvar ordem de produção (envia para backend)
  const saveProductionOrder = async () => {
    if (plans.length === 0) {
      toast.error('Adicione pelo menos um item à ordem de produção');
      return;
    }
    try {
      await axios.post(`${API_URL}/production/save-order`, { plans });
      toast.success('Ordem de produção salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar ordem de produção');
    }
  };

  // Função para calcular produção em lote
  const calculateMultiple = async () => {
    if (plans.length === 0) {
      toast.error('Adicione pelo menos um produto ao planejamento');
      return;
    }
    try {
      setCalculationLoading(true);
      const response = await axios.post(`${API_URL}/production/calculate-multiple`, {
        planos: plans.map(p => ({ codigo_produto: p.codigo_produto, quantidade: p.quantidade }))
      });
      setMultiPlansResult(response.data);
    } catch (error) {
      toast.error('Erro ao calcular produção em lote');
    } finally {
      setCalculationLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!productionPlan) return;

    // Cria worksheet com detalhes da produção
    const ws = XLSX.utils.json_to_sheet([
      {
        'Código do Produto': productionPlan.codigo_produto,
        'Descrição do Produto': productionPlan.descricao_produto,
        'Quantidade a Produzir': productionPlan.quantidade_a_produzir
      }
    ]);

    // Adiciona linhas vazias
    XLSX.utils.sheet_add_json(ws, [{}], { origin: 'A3' });

    // Adiciona cabeçalhos da tabela de insumos em português
    XLSX.utils.sheet_add_json(
      ws,
      [
        {
          'Código do Insumo': 'Código do Insumo',
          'Descrição do Insumo': 'Descrição do Insumo',
          'Quantidade Necessária': 'Quantidade Necessária',
          'Estoque Disponível': 'Estoque Disponível',
          'Status': 'Status',
          'Quantidade Faltante': 'Quantidade Faltante'
        }
      ],
      { origin: 'A4' }
    );

    // Adiciona dados dos insumos em português
    const inputsData = productionPlan.insumos.map(insumo => ({
      'Código do Insumo': insumo.codigo_produto_insumo,
      'Descrição do Insumo': insumo.descricao_insumo,
      'Quantidade Necessária': insumo.quantidade_necessaria,
      'Estoque Disponível': insumo.quantidade_estoque,
      'Status': insumo.status === 'available'
        ? 'Disponível'
        : insumo.status === 'insufficient'
          ? 'Insuficiente'
          : 'Indisponível',
      'Quantidade Faltante': insumo.status !== 'available'
        ? Math.max(0, insumo.quantidade_necessaria - insumo.quantidade_estoque)
        : 0
    }));

    XLSX.utils.sheet_add_json(ws, inputsData, { origin: 'A5', skipHeader: true });

    // Cria workbook e adiciona a worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planejamento de Produção');

    // Gera nome do arquivo em português
    const fileName = `Planejamento_${productionPlan.codigo_produto}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Salva o arquivo
    XLSX.writeFile(wb, fileName);
  };

  const exportMultiToExcel = () => {
    if (!multiPlansResult.length) return;
    const wb = XLSX.utils.book_new();
    multiPlansResult.forEach((plan, idx) => {
      const ws = XLSX.utils.json_to_sheet([
        {
          'Código do Produto': plan.codigo_produto,
          'Descrição do Produto': plan.descricao_produto,
          'Quantidade a Produzir': plan.quantidade_a_produzir
        }
      ]);
      XLSX.utils.sheet_add_json(ws, [{}], { origin: 'A3' });
      XLSX.utils.sheet_add_json(
        ws,
        [
          {
            'Código do Insumo': 'Código do Insumo',
            'Descrição do Insumo': 'Descrição do Insumo',
            'Quantidade Necessária': 'Quantidade Necessária',
            'Estoque Disponível': 'Estoque Disponível',
            'Status': 'Status',
            'Quantidade Faltante': 'Quantidade Faltante'
          }
        ],
        { origin: 'A4' }
      );
      const inputsData = plan.insumos.map(insumo => ({
        'Código do Insumo': insumo.codigo_produto_insumo,
        'Descrição do Insumo': insumo.descricao_insumo,
        'Quantidade Necessária': insumo.quantidade_necessaria,
        'Estoque Disponível': insumo.quantidade_estoque,
        'Status': insumo.status === 'available'
          ? 'Disponível'
          : insumo.status === 'insufficient'
            ? 'Insuficiente'
            : 'Indisponível',
        'Quantidade Faltante': insumo.status !== 'available'
          ? Math.max(0, insumo.quantidade_necessaria - insumo.quantidade_estoque)
          : 0
      }));
      XLSX.utils.sheet_add_json(ws, inputsData, { origin: 'A5', skipHeader: true });
      XLSX.utils.book_append_sheet(wb, ws, `Produto_${plan.codigo_produto}`);
    });
    XLSX.writeFile(wb, `Planejamento_Multiplo_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Adicionar Equipamento ao Planejamento</h2>
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
            <div className="mb-6">
              <label htmlFor="ordem_producao" className="block text-sm font-medium text-gray-700 mb-1">
                Ordem de Produção (OF*)
              </label>
              <input
                type="text"
                id="ordem_producao"
                value={ordemProducao}
                onChange={e => setOrdemProducao(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o número da ordem de produção"
              />
            </div>
            <button
              type="button"
              onClick={addPlan}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Adicionar ao Planejamento
            </button>
          </div>
          {plans.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold mb-2">Equipamentos no Planejamento</h3>
              <ul>
                {plans.map((plan, idx) => (
                  <li key={plan.ordem_producao} className="flex justify-between items-center border-b py-2">
                    <span>
                      <b>OF:</b> {plan.ordem_producao} | {plan.codigo_produto} - {plan.descricao_produto} (Qtd: {plan.quantidade})
                    </span>
                    <span className="flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 text-xs"
                        onClick={() => movePlanUp(idx)}
                        title="Mover para cima"
                        disabled={idx === 0}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="text-blue-600 hover:text-blue-900 text-xs"
                        onClick={() => movePlanDown(idx)}
                        title="Mover para baixo"
                        disabled={idx === plans.length - 1}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900 text-xs"
                        onClick={() => removePlan(plan.codigo_produto)}
                        title="Remover"
                      >
                        Remover
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={calculateMultiple}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                disabled={calculationLoading}
              >
                {calculationLoading ? 'Calculando...' : 'Calcular Planejamento'}
              </button>
              <button
                type="button"
                onClick={saveProductionOrder}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white bg-blue-700 hover:bg-blue-800 transition-colors"
              >
                <Save size={18} />
                Salvar Ordem de Produção
              </button>
              {multiPlansResult.length > 0 && (
                <button
                  type="button"
                  onClick={exportMultiToExcel}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                >
                  Exportar Planejamento para Excel
                </button>
              )}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          {multiPlansResult.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Resultado do Planejamento</h2>
              {multiPlansResult.map((plan, idx) => (
                <div key={plan.codigo_produto} className="mb-8 border-b pb-6 last:border-b-0 last:pb-0">
                  <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="font-medium">{plan.codigo_produto} - {plan.descricao_produto}</span>
                      <span className="ml-2 text-sm text-gray-500">Qtd: {plan.quantidade_a_produzir}</span>
                    </div>
                    <div>
                      {plan.insumos.every(i => i.status === 'available') ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pronto para produzir
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Faltam materiais
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Necessário</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponível</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {plan.insumos.map((insumo, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2">
                              <div className="text-sm font-medium text-gray-900">{insumo.codigo_produto_insumo}</div>
                              <div className="text-sm text-gray-500">{insumo.descricao_insumo}</div>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{insumo.quantidade_necessaria}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{insumo.quantidade_estoque}</td>
                            <td className="px-4 py-2">
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
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center justify-center h-full">
              <Factory size={64} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-500">Nenhum Planejamento</h3>
              <p className="text-gray-400 text-center mt-2">
                Adicione produtos ao planejamento e clique em "Calcular Planejamento" para ver os resultados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionPage;