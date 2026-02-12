import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { readExcelFile, exportRouteTemplateModel, exportTemplateItemsModel } from '../services/excelService';
import { Download, Upload, Trash2, Plus, Search, List, X, Save, Pencil } from 'lucide-react';
import { TemplateItem, Product, RouteTemplate } from '../types';

// --- Create/Edit Modal Component ---
interface ModalProps {
    onClose: () => void;
    editingTemplate?: RouteTemplate | null;
}

const CreateTemplateModal: React.FC<ModalProps> = ({ onClose, editingTemplate }) => {
    const { state, addRouteTemplate, updateRouteTemplate } = useApp();
    const { showToast } = useUI();

    const [name, setName] = useState('');
    const [tempItems, setTempItems] = useState<Omit<TemplateItem, 'id'>[]>([]);
    
    // Load existing data if editing
    useEffect(() => {
        if (editingTemplate) {
            setName(editingTemplate.name);
            setTempItems(editingTemplate.items.map(i => ({
                code: i.code,
                name: i.name,
                quantity: i.quantity,
                value: i.value
            })));
        }
    }, [editingTemplate]);
    
    // Manual Input State
    const [code, setCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [qty, setQty] = useState<number | ''>('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    
    const itemsFileInputRef = useRef<HTMLInputElement>(null);

    const handleImportItems = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const jsonData = await readExcelFile(e.target.files[0]);
                const newItems = jsonData.map((row: any) => ({
                    code: String(row.codigo || row.Codigo || row.CODE || ''),
                    name: String(row.nome || row.Nome || row.NAME || 'Item sem nome'),
                    quantity: Number(row.quantidade || row.Quantidade || row.QTD || 0),
                    value: 0 // Value is ignored in templates now
                })).filter((i: any) => i.code && i.name);
                
                setTempItems(prev => [...prev, ...newItems]);
                if (itemsFileInputRef.current) itemsFileInputRef.current.value = '';
                showToast(`${newItems.length} itens importados para o rascunho.`, 'success');
            } catch (err) {
                console.error(err);
                showToast('Erro ao ler itens. Verifique o modelo.', 'error');
            }
        }
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !qty) return;
        setTempItems(prev => [...prev, { code, name: itemName, quantity: Number(qty), value: 0 }]);
        setCode(''); setItemName(''); setQty(''); setSuggestions([]);
    };

    const handleRemoveItem = (index: number) => {
        setTempItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!name) {
            showToast("Nome da rota é obrigatório.", 'error');
            return;
        }

        if (editingTemplate) {
            updateRouteTemplate(editingTemplate.id, name, tempItems);
            showToast('Modelo atualizado com sucesso.', 'success');
        } else {
            addRouteTemplate(name, tempItems);
            showToast('Modelo de rota criado com sucesso.', 'success');
        }
        onClose();
    };

    // Auto-fill logic
    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const c = e.target.value;
      setCode(c);
      const prod = state.products.find(p => p.code.toLowerCase() === c.toLowerCase());
      if (prod) {
        setItemName(prod.name);
      }
      if (c.length > 1) {
        setSuggestions(state.products.filter(p => p.code.toLowerCase().includes(c.toLowerCase()) || p.name.toLowerCase().includes(c.toLowerCase())).slice(0, 5));
      } else {
        setSuggestions([]);
      }
    };
    
    const selectSuggestion = (prod: Product) => {
      setCode(prod.code);
      setItemName(prod.name);
      setSuggestions([]);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">
                        {editingTemplate ? 'Editar Modelo de Rota' : 'Nova Rota Padrão'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Rota (ex: Chaparia Padrão)</label>
                        <input 
                            className="w-full border rounded p-2 text-lg font-medium focus:ring-2 focus:ring-accent outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Digite o nome..."
                            autoFocus={!editingTemplate}
                        />
                    </div>

                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 border-b pb-4">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <List size={20} /> Itens Padrão ({tempItems.length})
                        </h4>
                        <div className="flex gap-2">
                             <button onClick={exportTemplateItemsModel} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-xs font-medium border">
                                <Download size={14} /> Modelo Excel
                             </button>
                             <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 cursor-pointer text-xs font-medium border border-blue-100">
                                <Upload size={14} /> Importar Itens
                                <input type="file" ref={itemsFileInputRef} onChange={handleImportItems} accept=".xlsx" className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Manual Entry Form */}
                    <div className="bg-slate-50 p-3 rounded mb-4 relative">
                        <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-2 items-end">
                             {/* Suggestions */}
                             {suggestions.length > 0 && (
                                <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 shadow-lg rounded-md w-64 z-10">
                                  {suggestions.map(s => (
                                    <div key={s.id} className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0" onClick={() => selectSuggestion(s)}>
                                      <span className="font-bold text-xs bg-slate-100 px-1 rounded mr-2">{s.code}</span>
                                      {s.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            <div className="col-span-2">
                                <label className="text-xs text-slate-500">Cód</label>
                                <input className="w-full border rounded p-1 text-sm" value={code} onChange={handleCodeChange} />
                            </div>
                            <div className="col-span-7">
                                <label className="text-xs text-slate-500">Produto (Referência)</label>
                                <input className="w-full border rounded p-1 text-sm" value={itemName} onChange={e => setItemName(e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-slate-500">Qtd</label>
                                <input type="number" className="w-full border rounded p-1 text-sm text-right" value={qty} onChange={e => setQty(Number(e.target.value))} />
                            </div>
                            <div className="col-span-1">
                                <button type="submit" className="w-full bg-accent text-white p-1.5 rounded hover:bg-blue-600 flex justify-center">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Items List */}
                    <div className="border rounded overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="p-2">Cód</th>
                                    <th className="p-2">Nome</th>
                                    <th className="p-2 text-right">Qtd</th>
                                    <th className="p-2 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tempItems.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-2 font-mono text-slate-500">{item.code}</td>
                                        <td className="p-2 truncate max-w-[200px]">{item.name}</td>
                                        <td className="p-2 text-right">{item.quantity}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tempItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            Nenhum item adicionado a este modelo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 text-right italic">
                        * O valor unitário será puxado do cadastro global ao criar o projeto.
                    </div>
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded font-medium flex items-center gap-2">
                        <Save size={18} /> {editingTemplate ? 'Atualizar Modelo' : 'Salvar Modelo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RouteTemplates: React.FC = () => {
  const { state, deleteRouteTemplate, importRouteTemplates } = useApp();
  const { showToast, confirm } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RouteTemplate | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null); // For importing list of templates
  
  const filtered = state.routeTemplates.filter(rt => 
    rt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTemplate = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Excluir Modelo',
      message: `Deseja excluir o modelo de rota "${name}"?`
    });
    if(isConfirmed) {
      deleteRouteTemplate(id);
      showToast('Modelo excluído.', 'success');
    }
  };

  const handleEdit = (template: RouteTemplate) => {
      setEditingTemplate(template);
      setIsModalOpen(true);
  };
  
  const handleCreate = () => {
      setEditingTemplate(null);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingTemplate(null);
  };

  // --- Import List of Routes (Names Only) ---
  const handleImportRoutes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const jsonData = await readExcelFile(e.target.files[0]);
        const names = jsonData
          .map((row: any) => String(row.nome || row.Nome || row.NOME || ''))
          .filter(n => n.trim().length > 0);
        
        importRouteTemplates(names);
        showToast(`${names.length} rotas importadas.`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        showToast('Erro ao ler arquivo.', 'error');
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Modelos de Rotas</h2>
            <p className="text-sm text-slate-500">Crie modelos com itens pré-definidos para agilizar novos projetos.</p>
        </div>
        <div className="flex gap-2">
          {/* Quick Import for just names */}
          <button onClick={exportRouteTemplateModel} className="hidden md:flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm border">
            <Download size={16} /> Lista de Nomes
          </button>
          
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-blue-600 shadow-sm font-medium"
          >
            <Plus size={18} /> Criar Nova Rota
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar modelo de rota..." 
          className="w-full pl-10 pr-4 py-2 border rounded shadow-sm focus:ring-2 focus:ring-accent focus:outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(rt => (
          <div key={rt.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-800">{rt.name}</h3>
                <div className="flex gap-1">
                     <button 
                        onClick={() => handleEdit(rt)}
                        className="text-slate-300 hover:text-blue-500 p-1"
                        title="Editar Itens"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => handleDeleteTemplate(rt.id, rt.name)} 
                        className="text-slate-300 hover:text-red-500 p-1"
                        title="Excluir Modelo"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="text-sm text-slate-500 mb-3">
                {rt.items && rt.items.length > 0 ? (
                    <span className="flex items-center gap-1">
                        <List size={14} /> {rt.items.length} itens pré-definidos
                    </span>
                ) : (
                    <span className="italic text-slate-400">Sem itens pré-definidos</span>
                )}
            </div>
            <div className="text-xs text-slate-400 border-t pt-2 flex flex-wrap gap-1">
                {rt.items?.slice(0, 3).map((i, idx) => (
                    <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">{i.name}</span>
                ))}
                {(rt.items?.length || 0) > 3 && <span>...</span>}
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded border border-dashed">
                Nenhum modelo de rota encontrado.
            </div>
        )}
      </div>

      {isModalOpen && <CreateTemplateModal onClose={handleCloseModal} editingTemplate={editingTemplate} />}
    </div>
  );
};

export default RouteTemplates;