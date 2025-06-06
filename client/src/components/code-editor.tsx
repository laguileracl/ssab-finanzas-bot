import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  X, 
  Save, 
  Download, 
  GitBranch, 
  Plus, 
  Minus,
  Check,
  Code
} from "lucide-react";
import { Script, ScriptVersion } from "@shared/schema";
import { formatTimeAgo, getCategoryColor } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  script: Script | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CodeEditor({ script, isOpen, onClose }: CodeEditorProps) {
  const [editedContent, setEditedContent] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [tags, setTags] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: versions = [] } = useQuery<ScriptVersion[]>({
    queryKey: ['/api/scripts', script?.id, 'versions'],
    enabled: !!script?.id,
  });

  useEffect(() => {
    if (script) {
      setEditedContent(script.content);
      setPerformanceNotes(script.performanceNotes || "");
      setTags(script.tags?.join(", ") || "");
    }
  }, [script]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!script) return;
      
      const updates = {
        content: editedContent,
        performanceNotes,
        tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
      };

      return apiRequest('PUT', `/api/scripts/${script.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Script saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts', script?.id] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save script",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!script) return;
      
      const response = await fetch(`/api/scripts/${script.id}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export script');
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      if (script) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = script.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Script exported successfully",
        });
      }
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export script",
        variant: "destructive",
      });
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!script) return;
      
      const versionData = {
        version: `v${versions.length + 1}.0.0`,
        content: editedContent,
        description: "Manual version creation",
        additions: editedContent.split('\n').length,
        deletions: 0,
      };

      return apiRequest('POST', `/api/scripts/${script.id}/versions`, versionData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New version created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scripts', script?.id, 'versions'] });
    },
    onError: () => {
      toast({
        title: "Version Creation Failed",
        description: "Failed to create new version",
        variant: "destructive",
      });
    },
  });

  const loadVersion = (version: ScriptVersion) => {
    setEditedContent(version.content);
    toast({
      title: "Version Loaded",
      description: `Loaded version ${version.version}`,
    });
  };

  const lineCount = editedContent.split('\n').length;

  if (!script) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 truncate" title={script.name}>
                  {script.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Badge className={getCategoryColor(script.category)}>
                  {script.category}
                </Badge>
                <span className="text-gray-500">
                  Modified {formatTimeAgo(script.lastModified!)}
                </span>
              </div>
            </div>

            {/* Version History */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Version History</h4>
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {version.version}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(version.createdAt!)}
                        </span>
                      </div>
                      {version.description && (
                        <p className="text-xs text-gray-600 mb-2">{version.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Plus className="h-3 w-3 mr-1 text-green-600" />
                          {version.additions} additions
                        </span>
                        <span className="flex items-center">
                          <Minus className="h-3 w-3 mr-1 text-red-600" />
                          {version.deletions} deletions
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata Section */}
              <div className="p-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      Performance Notes
                    </Label>
                    <Textarea
                      value={performanceNotes}
                      onChange={(e) => setPerformanceNotes(e.target.value)}
                      placeholder="Add performance notes..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">
                      Tags
                    </Label>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="divergence, rsi, momentum"
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label className="text-gray-600 block">Created</Label>
                      <span className="text-gray-900">
                        {new Date(script.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <Label className="text-gray-600 block">File Size</Label>
                      <span className="text-gray-900">{script.fileSize}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200">
              <div className="space-y-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export for TradingView
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createVersionMutation.mutate()}
                  disabled={createVersionMutation.isPending}
                  className="w-full"
                >
                  <GitBranch className="mr-2 h-4 w-4" />
                  Create New Version
                </Button>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <span className="text-white font-medium truncate">{script.name}</span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 text-white">Pine Script v5</Badge>
                  <span className="text-gray-300 text-sm">{lineCount} lines</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  <Code className="mr-1 h-4 w-4" />
                  Format
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Validate
                </Button>
              </div>
            </div>

            <div className="flex-1 flex bg-gray-900">
              {/* Line Numbers */}
              <div className="bg-gray-800 text-gray-500 text-right pr-4 py-4 text-sm font-mono leading-6 select-none">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i + 1}>{i + 1}</div>
                ))}
              </div>

              {/* Code Content */}
              <div className="flex-1 overflow-auto">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full bg-transparent text-white font-mono text-sm leading-6 p-4 resize-none border-none outline-none focus:ring-0"
                  placeholder="// Enter your Pine Script code here..."
                />
              </div>
            </div>

            {/* Status Bar */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between text-sm text-gray-300 border-t border-gray-700">
              <div className="flex items-center space-x-4">
                <span>Line 1, Column 1</span>
                <span>Pine Script v5</span>
                <span className="text-green-400 flex items-center">
                  <Check className="mr-1 h-4 w-4" />
                  Syntax Valid
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span>UTF-8</span>
                <span>LF</span>
                <span>{script.fileSize}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
