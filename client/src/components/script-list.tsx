import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Code, 
  Clock, 
  GitBranch, 
  TrendingUp, 
  Coins, 
  Download, 
  MoreVertical,
  List,
  Grid3x3
} from "lucide-react";
import { Script } from "@shared/schema";
import { formatTimeAgo, getCategoryColor, getStatusColor } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ScriptListProps {
  scripts: Script[];
  onScriptSelect: (script: Script) => void;
}

export function ScriptList({ scripts, onScriptSelect }: ScriptListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: async (scriptId: number) => {
      const response = await fetch(`/api/scripts/${scriptId}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export script');
      }
      
      return response.blob();
    },
    onSuccess: (blob, scriptId) => {
      const script = scripts.find(s => s.id === scriptId);
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

  const handleExport = (e: React.MouseEvent, scriptId: number) => {
    e.stopPropagation();
    exportMutation.mutate(scriptId);
  };

  const getPerformanceColor = (performance: string) => {
    if (performance.startsWith('+')) return 'text-green-600';
    if (performance.startsWith('-')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Scripts Repository</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{scripts.length} scripts</span>
            <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 h-8 w-8 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1 h-8 w-8 ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {scripts.length === 0 ? (
            <div className="p-12 text-center">
              <Code className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scripts found</h3>
              <p className="text-gray-600">Upload your first Pine Script to get started.</p>
            </div>
          ) : (
            scripts.map((script) => (
              <div
                key={script.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onScriptSelect(script)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Code className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{script.name}</h3>
                      <Badge className={getCategoryColor(script.category)}>
                        {script.category}
                      </Badge>
                      <Badge className={getStatusColor(script.status)}>
                        {script.status}
                      </Badge>
                    </div>
                    
                    {script.description && (
                      <p className="text-gray-600 text-sm mb-3">{script.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Modified {formatTimeAgo(script.lastModified!)}
                      </span>
                      <span className="flex items-center">
                        <GitBranch className="h-4 w-4 mr-1" />
                        {script.id} versions
                      </span>
                      {script.timeframe && (
                        <span className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Timeframe: {script.timeframe}
                        </span>
                      )}
                      {script.tradingPair && (
                        <span className="flex items-center">
                          <Coins className="h-4 w-4 mr-1" />
                          Pair: {script.tradingPair}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {script.performance && (
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getPerformanceColor(script.performance)}`}>
                          {script.performance}
                        </div>
                        <div className="text-xs text-gray-500">30 days</div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 h-8 w-8"
                      onClick={(e) => handleExport(e, script.id)}
                      disabled={exportMutation.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 h-8 w-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
