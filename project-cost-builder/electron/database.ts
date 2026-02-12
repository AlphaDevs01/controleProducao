import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { AppState } from './types';

// --- CONFIGURAÇÃO DO CAMINHO DE REDE ---
const NETWORK_DIR = '\\\\192.168.1.2\\publica\\Diomar Gonçalves\\dados';
const DB_FILE_NAME = 'project_cost.db';
const DB_PATH = path.join(NETWORK_DIR, DB_FILE_NAME);

let db: sqlite3.Database | null = null;
let initPromise: Promise<void> | null = null;

// Helper para transformar callbacks do SQLite em Promises
const run = (sql: string, params: any[] = []) => {
    return new Promise<void>((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

const query = (sql: string, params: any[] = []) => {
    return new Promise<any[]>((resolve, reject) => {
        if (!db) return reject(new Error("Database not initialized"));
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- HELPER: Deduplicação ---
const getUnique = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

// --- INITIALIZATION ---
export const initDB = () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            console.log(`[SQLite] Tentando conectar em: ${DB_PATH}`);

            if (!fs.existsSync(NETWORK_DIR)) {
                try {
                    fs.mkdirSync(NETWORK_DIR, { recursive: true });
                } catch (e) {
                    console.error("[SQLite] Erro ao criar diretório.", e);
                    throw new Error("Caminho de rede inacessível.");
                }
            }

            await new Promise<void>((resolve, reject) => {
                db = new sqlite3.Database(DB_PATH, (err) => {
                    if (err) {
                        console.error('[SQLite] Erro ao abrir arquivo do banco:', err.message);
                        reject(err);
                    } else {
                        console.log('[SQLite] Conectado com sucesso.');
                        resolve();
                    }
                });
            });

            // Tabelas
            await run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)`);

            await run(`CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY, code TEXT, name TEXT, value REAL
            )`);

            // Reativando tabelas de Rotas Padrão (necessário para a tela "Banco de Rotas")
            await run(`CREATE TABLE IF NOT EXISTS route_templates (
                id TEXT PRIMARY KEY, name TEXT
            )`);
            
            await run(`CREATE TABLE IF NOT EXISTS template_items (
                id TEXT PRIMARY KEY, template_id TEXT, code TEXT, name TEXT, quantity REAL, value REAL,
                FOREIGN KEY(template_id) REFERENCES route_templates(id) ON DELETE CASCADE
            )`);

            await run(`CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, name TEXT, created_at TEXT
            )`);
            
            await run(`CREATE TABLE IF NOT EXISTS project_routes (
                id TEXT PRIMARY KEY, project_id TEXT, name TEXT,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            )`);
            
            await run(`CREATE TABLE IF NOT EXISTS route_items (
                id TEXT PRIMARY KEY, route_id TEXT, code TEXT, name TEXT, quantity REAL, value REAL, total_calculado REAL,
                FOREIGN KEY(route_id) REFERENCES project_routes(id) ON DELETE CASCADE
            )`);

            console.log('[SQLite] Tabelas verificadas/criadas.');

        } catch (err) {
            console.error('[SQLite] Falha crítica na inicialização:', err);
            db = null;
            throw err;
        }
    })();

    return initPromise;
};

// --- SAVE ---
let saveQueue = Promise.resolve();

const performSave = async (state: AppState) => {
    if (!db) {
        initPromise = null; 
        await initDB();
        if (!db) throw new Error("Não foi possível conectar ao banco de dados.");
    }

    return new Promise<void>((resolve, reject) => {
        if (!db) return reject(new Error("No DB"));

        db.serialize(() => {
            db!.run("BEGIN TRANSACTION");

            // --- 1. CONFIG ---
            const stmtConfig = db!.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)");
            stmtConfig.run('equipmentPercentage', state.config.equipmentPercentage.toString());
            stmtConfig.finalize();

            // --- 2. PRODUTOS ---
            db!.run("DELETE FROM products");
            const stmtProd = db!.prepare("INSERT INTO products (id, code, name, value) VALUES (?, ?, ?, ?)");
            const uniqueProducts = getUnique(state.products);
            uniqueProducts.forEach(p => stmtProd.run(p.id, p.code, p.name, p.value));
            stmtProd.finalize();

            // --- 3. BANCO DE ROTAS (Rotas Padrão) ---
            db!.run("DELETE FROM template_items");
            db!.run("DELETE FROM route_templates");
            
            const stmtTempl = db!.prepare("INSERT INTO route_templates (id, name) VALUES (?, ?)");
            const stmtTemplItem = db!.prepare("INSERT INTO template_items (id, template_id, code, name, quantity, value) VALUES (?, ?, ?, ?, ?, ?)");
            
            const uniqueTemplates = getUnique(state.routeTemplates);
            uniqueTemplates.forEach(t => {
                stmtTempl.run(t.id, t.name);
                const uniqueItems = getUnique(t.items);
                uniqueItems.forEach(i => {
                    stmtTemplItem.run(i.id, t.id, i.code, i.name, i.quantity, i.value);
                });
            });
            stmtTempl.finalize();
            stmtTemplItem.finalize();

            // --- 4. PROJETOS ---
            db!.run("DELETE FROM route_items");
            db!.run("DELETE FROM project_routes");
            db!.run("DELETE FROM projects");

            const stmtProj = db!.prepare("INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)");
            const stmtRoute = db!.prepare("INSERT INTO project_routes (id, project_id, name) VALUES (?, ?, ?)");
            const stmtItem = db!.prepare("INSERT INTO route_items (id, route_id, code, name, quantity, value, total_calculado) VALUES (?, ?, ?, ?, ?, ?, ?)");

            const uniqueProjects = getUnique(state.projects);
            uniqueProjects.forEach(p => {
                stmtProj.run(p.id, p.name, p.createdAt);
                const uniqueRoutes = getUnique(p.routes);
                uniqueRoutes.forEach(r => {
                    stmtRoute.run(r.id, p.id, r.name);
                    const uniqueRouteItems = getUnique(r.items);
                    uniqueRouteItems.forEach(i => {
                        stmtItem.run(i.id, r.id, i.code, i.name, i.quantity, i.value, i.totalCalculado);
                    });
                });
            });
            
            stmtProj.finalize();
            stmtRoute.finalize();
            stmtItem.finalize();

            // --- COMMIT ---
            db!.run("COMMIT", (err) => {
                if (err) {
                    console.error("[SQLite] Erro no COMMIT:", err);
                    db!.run("ROLLBACK");
                    reject(err);
                } else {
                    console.log(`[SQLite] Salvo. Proj: ${uniqueProjects.length}, Prod: ${uniqueProducts.length}, RotasPadrão: ${uniqueTemplates.length}`);
                    resolve();
                }
            });
        });
    });
};

export const saveStateToDB = async (state: AppState) => {
    saveQueue = saveQueue.then(() => performSave(state)).catch(err => {
        console.error("Erro na fila de salvamento:", err);
        throw err;
    });
    return saveQueue;
};

// --- LOAD ---
export const loadStateFromDB = async (): Promise<AppState> => {
    if (!db) {
        try { await initDB(); } catch (e) {
            console.warn("[SQLite] Falha ao iniciar DB, retornando vazio.");
            return { products: [], routeTemplates: [], projects: [], config: { equipmentPercentage: 80 } };
        }
    }
    
    if (!db) return { products: [], routeTemplates: [], projects: [], config: { equipmentPercentage: 80 } };

    const state: AppState = {
        products: [],
        routeTemplates: [],
        projects: [],
        config: { equipmentPercentage: 80 }
    };

    try {
        // Config
        try {
            const rowsConfig = await query("SELECT value FROM config WHERE key = ?", ['equipmentPercentage']);
            if (rowsConfig.length > 0) state.config.equipmentPercentage = Number(rowsConfig[0].value);
        } catch (e) { console.warn("Erro config", e); }

        // Products
        try {
            const rowsProd = await query("SELECT * FROM products");
            state.products = rowsProd.map(row => ({
                id: row.id, code: row.code, name: row.name, value: row.value
            }));
        } catch (e) { console.warn("Erro produtos", e); }

        // Banco de Rotas (Rotas Padrão)
        try {
            const rowsTempl = await query("SELECT * FROM route_templates");
            for (const t of rowsTempl) {
                const items = await query("SELECT * FROM template_items WHERE template_id = ?", [t.id]);
                state.routeTemplates.push({
                    id: t.id,
                    name: t.name,
                    items: items.map(i => ({
                        id: i.id, code: i.code, name: i.name, quantity: i.quantity, value: i.value
                    }))
                });
            }
        } catch (e) { console.warn("Erro rotas padrão", e); }

        // Projects
        try {
            const rowsProj = await query("SELECT * FROM projects");
            for (const p of rowsProj) {
                const routes: any[] = [];
                const rowsRoutes = await query("SELECT * FROM project_routes WHERE project_id = ?", [p.id]);
                
                for (const r of rowsRoutes) {
                    const items = await query("SELECT * FROM route_items WHERE route_id = ?", [r.id]);
                    routes.push({
                        id: r.id,
                        projectId: r.project_id,
                        name: r.name,
                        items: items.map(i => ({
                            id: i.id,
                            projectRouteId: i.route_id,
                            code: i.code,
                            name: i.name,
                            quantity: i.quantity,
                            value: i.value,
                            totalCalculado: i.total_calculado
                        }))
                    });
                }
                state.projects.push({
                    id: p.id, name: p.name, createdAt: p.created_at, routes: routes
                });
            }
        } catch (e) {
            console.error("Erro crítico ao ler projetos", e);
            throw e;
        }

        return state;
    } catch (err) {
        console.error("[SQLite] Erro ao carregar dados:", err);
        throw err;
    }
};