import * as XLSX from 'xlsx';
import { Project, ProjectRoute, Product, ItemRota } from '../types';

// --- Export Helpers ---

export const exportRouteToExcel = (project: Project, route: ProjectRoute) => {
  const data = route.items.map(item => ({
    'Código': item.code,
    'Nome': item.name,
    'Quantidade': item.quantity,
    'Valor Unit.': item.value,
    'Total': item.totalCalculado
  }));

  // Add Total Row
  const total = route.items.reduce((acc, item) => acc + item.totalCalculado, 0);
  data.push({
    'Código': '',
    'Nome': 'TOTAL ROTA',
    'Quantidade': 0,
    'Valor Unit.': 0,
    'Total': total
  } as any);

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, route.name.substring(0, 30));
  
  XLSX.writeFile(wb, `${project.name}_${route.name}.xlsx`);
};

export const exportProjectToExcel = (project: Project, equipmentPercent: number) => {
  const wb = XLSX.utils.book_new();
  let grandTotal = 0;

  // 1. Summary Sheet
  const summaryData = project.routes.map(r => {
    const rTotal = r.items.reduce((acc, i) => acc + i.totalCalculado, 0);
    grandTotal += rTotal;
    return {
      'Rota': r.name,
      'Total Bruto': rTotal,
    };
  });

  const percentValue = grandTotal * (equipmentPercent / 100);
  
  summaryData.push({ 'Rota': '---', 'Total Bruto': 0 });
  summaryData.push({ 'Rota': 'TOTAL GERAL BRUTO', 'Total Bruto': grandTotal });
  summaryData.push({ 'Rota': `TOTAL (${equipmentPercent}%)`, 'Total Bruto': percentValue });

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMO");

  // 2. Individual Route Sheets
  project.routes.forEach(route => {
    const data = route.items.map(item => ({
      'Código': item.code,
      'Nome': item.name,
      'Quantidade': item.quantity,
      'Valor Unit.': item.value,
      'Total': item.totalCalculado
    }));

    const total = route.items.reduce((acc, item) => acc + item.totalCalculado, 0);
    data.push({
      'Código': '', 'Nome': 'TOTAL', 'Quantidade': null, 'Valor Unit.': null, 'Total': total
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    // Excel sheet names max 31 chars
    const safeName = route.name.replace(/[:\/\\?*\[\]]/g, "").substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, safeName || "Rota");
  });

  XLSX.writeFile(wb, `PROJETO_${project.name}.xlsx`);
};

export const exportProjectExplodedToExcel = (project: Project) => {
  const wb = XLSX.utils.book_new();
  const allItems: any[] = [];

  project.routes.forEach(route => {
    route.items.forEach(item => {
      allItems.push({
        'Rota': route.name,
        'Código': item.code,
        'Nome': item.name,
        'Quantidade': item.quantity,
        'Valor Unit.': item.value,
        'Total': item.totalCalculado
      });
    });
  });

  // Sort by name or code if needed, currently leaving as is (grouped by route naturally)

  // Add Grand Total row
  const total = allItems.reduce((acc, i) => acc + i['Total'], 0);
  allItems.push({
    'Rota': 'TOTAL GERAL',
    'Código': '',
    'Nome': '',
    'Quantidade': 0,
    'Valor Unit.': 0,
    'Total': total
  });

  const ws = XLSX.utils.json_to_sheet(allItems);
  // Auto-width columns slightly
  const wscols = [
    {wch: 20}, // Rota
    {wch: 15}, // Codigo
    {wch: 40}, // Nome
    {wch: 10}, // Qtd
    {wch: 15}, // Valor
    {wch: 15}, // Total
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, "Lista Geral Explodida");
  XLSX.writeFile(wb, `PROJETO_${project.name}_EXPLODIDO.xlsx`);
};

export const exportProductTemplate = () => {
  const data = [
    { 'codigo': 'COD001', 'nome': 'Exemplo Produto A', 'valor': 10.50 },
    { 'codigo': 'COD002', 'nome': 'Exemplo Produto B', 'valor': 25.00 },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "Modelo_Produtos.xlsx");
};

export const exportRouteTemplateModel = () => {
  const data = [
    { 'nome': 'CHAPARIA' },
    { 'nome': 'PINTURA' },
    { 'nome': 'HIDRÁULICA' },
    { 'nome': 'ELÉTRICA' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rotas");
  XLSX.writeFile(wb, "Modelo_Rotas.xlsx");
};

export const exportTemplateItemsModel = () => {
  const data = [
    { 'codigo': 'ITEM01', 'nome': 'Item Exemplo', 'quantidade': 10 },
    { 'codigo': 'ITEM02', 'nome': 'Outro Item', 'quantidade': 2 },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ItensRota");
  XLSX.writeFile(wb, "Modelo_Itens_Rota.xlsx");
};

// --- Import Helpers ---

export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};