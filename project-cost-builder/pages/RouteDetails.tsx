import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Trash2, Plus, Search, FileSpreadsheet } from 'lucide-react';
import { exportRouteToExcel } from '../services/excelService';

const RouteDetails: React.FC = () => {
  const { projectId, routeId } = useParams() as { projectId: string; routeId: string };
  const { state, addItemToRoute, updateItemInRoute, removeItemFromRoute } = useApp();
  
  // Local state for the "Add Item" form to make it speedy
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number | ''>('');
  const [newItemValue, setNewItemValue] = useState<number | ''>('');
  const [suggestions, setSuggestions] = useState<typeof state.products>([]);

  const project = state.projects.find(p => p.id === projectId);
  const route = project?.routes.find(r => r.id === routeId);

  if (!project || !route) return <div className="p-6">Rota não encontrada.</div>;

  const routeTotal = route.items.reduce((acc, item) => acc + item.totalCalculado, 0);

  // Auto-fill logic
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setNewItemCode(code);
    
    // Find exact match
    const prod = state.products.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (prod) {
      setNewItemName(prod.name);
      setNewItemValue(prod.value);
    }

    // Filter suggestions
    if (code.length > 1) {
      setSuggestions(state.products.filter(p => p.code.toLowerCase().includes(code.toLowerCase()) || p.name.toLowerCase().includes(code.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (prod: typeof state.products[0]) => {
    setNewItemCode(prod.code);
    setNewItemName(prod.name);
    setNewItemValue(prod.value);
    setSuggestions([]);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemQty || !newItemValue) return;

    addItemToRoute(project.id, route.id, {
      code: newItemCode,
      name: newItemName,
      quantity: Number(newItemQty),
      value: Number(newItemValue)
    });

    // Reset fields for rapid entry
    setNewItemCode('');
    setNewItemName('');
    setNewItemQty('');
    setNewItemValue('');
    setSuggestions([]);
    
    // Focus back on code input (requires ref, skipping for brevity, user can tab)
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${project.id}`} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-slate-800">{route.name}</h2>
              <span className="text-sm text-slate-500">em {project.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Rota</p>
              <p className="text-2xl font-bold text-accent">R$ {routeTotal.toFixed(2)}</p>
           </div>
           <button 
             onClick={() => exportRouteToExcel(project, route)}
             className="p-2 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200"
             title="Exportar esta rota"
           >
             <FileSpreadsheet size={20} />
           </button>
        </div>
      </div>

      {/* Spreadsheet/Table Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 bg-slate-100 p-3 text-sm font-semibold text-slate-600 border-b">
          <div className="col-span-2">Código</div>
          <div className="col-span-4">Descrição / Produto</div>
          <div className="col-span-2 text-right">Qtd.</div>
          <div className="col-span-2 text-right">Valor Unit.</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {route.items.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 group text-sm">
              <div className="col-span-2 font-mono text-slate-500">{item.code}</div>
              <div className="col-span-4 truncate">{item.name}</div>
              <div className="col-span-2">
                <input 
                  type="number"
                  className="w-full text-right bg-transparent border-b border-transparent focus:border-accent focus:outline-none hover:border-slate-300"
                  value={item.quantity}
                  onChange={(e) => updateItemInRoute(project.id, route.id, item.id, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                 <input 
                  type="number" step="0.01"
                  className="w-full text-right bg-transparent border-b border-transparent focus:border-accent focus:outline-none hover:border-slate-300"
                  value={item.value}
                  onChange={(e) => updateItemInRoute(project.id, route.id, item.id, { value: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2 text-right font-medium flex justify-end items-center gap-3">
                <span>{item.totalCalculado.toFixed(2)}</span>
                <button 
                  onClick={() => removeItemFromRoute(project.id, route.id, item.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {route.items.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              Nenhum item nesta rota. Adicione abaixo.
            </div>
          )}
        </div>

        {/* Input Bar (Sticky Bottom) */}
        <div className="bg-slate-50 p-4 border-t border-slate-200">
           <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-2 items-start relative">
              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 shadow-lg rounded-md w-64 z-10">
                  {suggestions.map(s => (
                    <div 
                      key={s.id} 
                      className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                      onClick={() => selectSuggestion(s)}
                    >
                      <span className="font-bold text-xs bg-slate-100 px-1 rounded mr-2">{s.code}</span>
                      {s.name}
                    </div>
                  ))}
                </div>
              )}

              <div className="col-span-2">
                <input 
                  placeholder="Cód." 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  value={newItemCode}
                  onChange={handleCodeChange}
                />
              </div>
              <div className="col-span-4">
                <input 
                  placeholder="Nome do Produto / Serviço" 
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" placeholder="Qtd" 
                  className="w-full border border-slate-300 rounded p-2 text-sm text-right focus:ring-2 focus:ring-accent outline-none"
                  value={newItemQty}
                  onChange={e => setNewItemQty(Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <input 
                  type="number" step="0.01" placeholder="Valor" 
                  className="w-full border border-slate-300 rounded p-2 text-sm text-right focus:ring-2 focus:ring-accent outline-none"
                  value={newItemValue}
                  onChange={e => setNewItemValue(Number(e.target.value))}
                />
              </div>
              <div className="col-span-2">
                <button type="submit" className="w-full bg-accent text-white py-2 rounded shadow hover:bg-blue-600 flex justify-center items-center gap-1 text-sm font-medium">
                  <Plus size={16} /> Add
                </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default RouteDetails;