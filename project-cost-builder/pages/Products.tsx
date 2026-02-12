import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { Product } from '../types';
import { readExcelFile, exportProductTemplate } from '../services/excelService';
import { Download, Upload, Trash2, Plus, Search } from 'lucide-react';

const Products: React.FC = () => {
  const { state, addProduct, updateProduct, deleteProduct, importProducts, clearProducts } = useApp();
  const { showToast, confirm } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = state.products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const jsonData = await readExcelFile(e.target.files[0]);
        // Normalize keys
        const formatted = jsonData.map((row: any) => ({
          code: String(row.codigo || row.Codigo || row.CODE || ''),
          name: String(row.nome || row.Nome || row.NAME || ''),
          value: Number(row.valor || row.Valor || row.VALUE || 0)
        })).filter((p: any) => p.code && p.name);
        
        importProducts(formatted);
        showToast(`${formatted.length} produtos processados.`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        showToast('Erro ao ler arquivo Excel. Verifique o formato.', 'error');
      }
    }
  };

  const handleClearProducts = async () => {
    const isConfirmed = await confirm({
      title: 'Zerar Estoque/Base',
      message: 'Isso apagará permanentemente todos os produtos cadastrados na base global. Essa ação não pode ser desfeita. Tem certeza?'
    });

    if (isConfirmed) {
      clearProducts();
      showToast('Todos os produtos foram removidos.', 'info');
    }
  };

  const ProductForm = () => {
    const [formData, setFormData] = useState<Partial<Product>>(editingProd || { code: '', name: '', value: 0 });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.code || !formData.name) return;
      
      const prodToSave = {
        id: editingProd ? editingProd.id : crypto.randomUUID(),
        code: formData.code,
        name: formData.name,
        value: Number(formData.value)
      } as Product;

      if (editingProd) {
        updateProduct(prodToSave);
        showToast('Produto atualizado.', 'success');
      } else {
        addProduct(prodToSave);
        showToast('Produto adicionado.', 'success');
      }

      setIsModalOpen(false);
      setEditingProd(null);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
          <h3 className="text-lg font-bold mb-4">{editingProd ? 'Editar' : 'Novo'} Produto</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Código</label>
              <input 
                className="w-full border rounded p-2 mt-1" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome</label>
              <input 
                className="w-full border rounded p-2 mt-1" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Valor Unit.</label>
              <input 
                type="number" step="0.01"
                className="w-full border rounded p-2 mt-1" 
                value={formData.value} 
                onChange={e => setFormData({...formData, value: Number(e.target.value)})}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-accent text-white rounded hover:bg-blue-600">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Catálogo Global de Produtos</h2>
        <div className="flex gap-2">
           <button 
            onClick={handleClearProducts}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
            title="Apaga todos os produtos (Zerar Estoque/Base)"
          >
            <Trash2 size={16} /> Zerar Base
          </button>
          <button onClick={exportProductTemplate} className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 text-sm">
            <Download size={16} /> Modelo
          </button>
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer text-sm">
            <Upload size={16} /> Importar
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx" className="hidden" />
          </label>
          <button 
            onClick={() => { setEditingProd(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-blue-600 text-sm font-medium"
          >
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar produto por nome ou código..." 
          className="w-full pl-10 pr-4 py-2 border rounded shadow-sm focus:ring-2 focus:ring-accent focus:outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="p-3 border-b">Código</th>
              <th className="p-3 border-b">Nome</th>
              <th className="p-3 border-b text-right">Valor</th>
              <th className="p-3 border-b text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 border-b last:border-0">
                <td className="p-3 font-mono text-slate-600">{p.code}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right">R$ {p.value.toFixed(2)}</td>
                <td className="p-3 flex justify-center gap-2">
                  <button onClick={() => { setEditingProd(p); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700">Editar</button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-500 hover:text-red-700">Excluir</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && <ProductForm />}
    </div>
  );
};

export default Products;