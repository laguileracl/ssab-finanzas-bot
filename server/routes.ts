import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScriptSchema, insertScriptVersionSchema } from "@shared/schema";
import multer from "multer";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pine', '.txt'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pine and .txt files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all scripts
  app.get("/api/scripts", async (req, res) => {
    try {
      const { search, category, timeframes, tradingPair, performance } = req.query;
      
      let scripts;
      
      if (search) {
        scripts = await storage.searchScripts(search as string);
      } else if (category || timeframes || tradingPair || performance) {
        scripts = await storage.filterScripts({
          category: category as string,
          timeframes: timeframes ? (timeframes as string).split(',') : undefined,
          tradingPair: tradingPair as string,
          performance: performance as string,
        });
      } else {
        scripts = await storage.getScripts();
      }
      
      res.json(scripts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scripts" });
    }
  });

  // Get single script
  app.get("/api/scripts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }
      
      res.json(script);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch script" });
    }
  });

  // Create new script
  app.post("/api/scripts", async (req, res) => {
    try {
      const scriptData = insertScriptSchema.parse(req.body);
      const script = await storage.createScript(scriptData);
      res.status(201).json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid script data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create script" });
    }
  });

  // Update script
  app.put("/api/scripts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scriptData = insertScriptSchema.partial().parse(req.body);
      const script = await storage.updateScript(id, scriptData);
      
      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }
      
      res.json(script);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid script data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update script" });
    }
  });

  // Delete script
  app.delete("/api/scripts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScript(id);
      
      if (!success) {
        return res.status(404).json({ message: "Script not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete script" });
    }
  });

  // Upload script file
  app.post("/api/scripts/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const name = req.file.originalname;
      const fileSize = `${(req.file.size / 1024).toFixed(1)} KB`;

      // Extract metadata from Pine Script comments if available
      const lines = content.split('\n');
      const firstLine = lines[0] || '';
      let description = '';
      
      // Look for title in Pine Script
      const titleMatch = firstLine.match(/["']([^"']+)["']/);
      if (titleMatch) {
        description = titleMatch[1];
      }

      const scriptData = {
        name,
        content,
        description: description || `Uploaded Pine Script: ${name}`,
        category: 'trend-following', // Default category
        status: 'testing' as const,
        fileSize,
        tags: [],
      };

      const script = await storage.createScript(scriptData);
      res.status(201).json(script);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: "Failed to upload script" });
    }
  });

  // Get script versions
  app.get("/api/scripts/:id/versions", async (req, res) => {
    try {
      const scriptId = parseInt(req.params.id);
      const versions = await storage.getScriptVersions(scriptId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch script versions" });
    }
  });

  // Create new version
  app.post("/api/scripts/:id/versions", async (req, res) => {
    try {
      const scriptId = parseInt(req.params.id);
      const versionData = insertScriptVersionSchema.parse({
        ...req.body,
        scriptId,
      });
      
      const version = await storage.createScriptVersion(versionData);
      res.status(201).json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid version data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create version" });
    }
  });

  // Export script
  app.get("/api/scripts/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const script = await storage.getScript(id);
      
      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${script.name}"`);
      res.send(script.content);
    } catch (error) {
      res.status(500).json({ message: "Failed to export script" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
