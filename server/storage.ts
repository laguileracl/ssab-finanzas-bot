import { 
  scripts, 
  scriptVersions,
  type Script, 
  type InsertScript,
  type ScriptVersion,
  type InsertScriptVersion
} from "@shared/schema";

export interface IStorage {
  // Script operations
  getScript(id: number): Promise<Script | undefined>;
  getScripts(): Promise<Script[]>;
  createScript(script: InsertScript): Promise<Script>;
  updateScript(id: number, script: Partial<InsertScript>): Promise<Script | undefined>;
  deleteScript(id: number): Promise<boolean>;
  searchScripts(query: string): Promise<Script[]>;
  filterScripts(filters: {
    category?: string;
    timeframes?: string[];
    tradingPair?: string;
    performance?: string;
  }): Promise<Script[]>;

  // Version operations
  getScriptVersions(scriptId: number): Promise<ScriptVersion[]>;
  createScriptVersion(version: InsertScriptVersion): Promise<ScriptVersion>;
  getScriptVersion(id: number): Promise<ScriptVersion | undefined>;
}

export class MemStorage implements IStorage {
  private scripts: Map<number, Script>;
  private scriptVersions: Map<number, ScriptVersion>;
  private currentScriptId: number;
  private currentVersionId: number;

  constructor() {
    this.scripts = new Map();
    this.scriptVersions = new Map();
    this.currentScriptId = 1;
    this.currentVersionId = 1;
  }

  async getScript(id: number): Promise<Script | undefined> {
    return this.scripts.get(id);
  }

  async getScripts(): Promise<Script[]> {
    return Array.from(this.scripts.values()).sort((a, b) => 
      new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime()
    );
  }

  async createScript(insertScript: InsertScript): Promise<Script> {
    const now = new Date();
    const id = this.currentScriptId++;
    const script: Script = {
      ...insertScript,
      id,
      createdAt: now,
      lastModified: now,
    };
    this.scripts.set(id, script);

    // Create initial version
    await this.createScriptVersion({
      scriptId: id,
      version: "v1.0.0",
      content: insertScript.content,
      description: "Initial version",
      additions: insertScript.content.split('\n').length,
      deletions: 0,
    });

    return script;
  }

  async updateScript(id: number, updates: Partial<InsertScript>): Promise<Script | undefined> {
    const script = this.scripts.get(id);
    if (!script) return undefined;

    const updatedScript: Script = {
      ...script,
      ...updates,
      lastModified: new Date(),
    };
    this.scripts.set(id, updatedScript);
    return updatedScript;
  }

  async deleteScript(id: number): Promise<boolean> {
    const deleted = this.scripts.delete(id);
    // Also delete all versions
    const versions = Array.from(this.scriptVersions.values()).filter(v => v.scriptId === id);
    versions.forEach(v => this.scriptVersions.delete(v.id));
    return deleted;
  }

  async searchScripts(query: string): Promise<Script[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.scripts.values()).filter(script =>
      script.name.toLowerCase().includes(lowerQuery) ||
      script.description?.toLowerCase().includes(lowerQuery) ||
      script.content.toLowerCase().includes(lowerQuery) ||
      script.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async filterScripts(filters: {
    category?: string;
    timeframes?: string[];
    tradingPair?: string;
    performance?: string;
  }): Promise<Script[]> {
    return Array.from(this.scripts.values()).filter(script => {
      if (filters.category && script.category !== filters.category) return false;
      if (filters.timeframes && filters.timeframes.length > 0 && 
          !filters.timeframes.includes(script.timeframe || '')) return false;
      if (filters.tradingPair && script.tradingPair !== filters.tradingPair) return false;
      if (filters.performance && filters.performance !== 'all') {
        if (filters.performance === 'profitable' && (script.performanceValue || 0) <= 0) return false;
        if (filters.performance === 'testing' && script.status !== 'testing') return false;
      }
      return true;
    });
  }

  async getScriptVersions(scriptId: number): Promise<ScriptVersion[]> {
    return Array.from(this.scriptVersions.values())
      .filter(version => version.scriptId === scriptId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createScriptVersion(insertVersion: InsertScriptVersion): Promise<ScriptVersion> {
    const id = this.currentVersionId++;
    const version: ScriptVersion = {
      ...insertVersion,
      id,
      createdAt: new Date(),
    };
    this.scriptVersions.set(id, version);
    return version;
  }

  async getScriptVersion(id: number): Promise<ScriptVersion | undefined> {
    return this.scriptVersions.get(id);
  }
}

export const storage = new MemStorage();
