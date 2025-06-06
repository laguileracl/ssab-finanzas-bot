import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, GitBranch } from "lucide-react";
import { Script } from "@shared/schema";
import { UploadArea } from "@/components/upload-area";
import { ScriptFilters } from "@/components/script-filters";
import { ScriptList } from "@/components/script-list";
import { CodeEditor } from "@/components/code-editor";

interface Filters {
  category: string;
  timeframes: string[];
  tradingPair: string;
  performance: string;
}

export default function Repository() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    category: '',
    timeframes: [],
    tradingPair: '',
    performance: 'all',
  });
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    
    if (filters.category) {
      params.append('category', filters.category);
    }
    
    if (filters.timeframes.length > 0) {
      params.append('timeframes', filters.timeframes.join(','));
    }
    
    if (filters.tradingPair) {
      params.append('tradingPair', filters.tradingPair);
    }
    
    if (filters.performance && filters.performance !== 'all') {
      params.append('performance', filters.performance);
    }
    
    return params.toString();
  };

  const { data: scripts = [], isLoading } = useQuery<Script[]>({
    queryKey: ['/api/scripts', buildQueryParams()],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const url = queryParams ? `/api/scripts?${queryParams}` : '/api/scripts';
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }
      
      return response.json();
    },
  });

  const handleScriptSelect = (script: Script) => {
    setSelectedScript(script);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedScript(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <GitBranch className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">PineScript Manager</h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-900 hover:text-blue-600 font-medium border-b-2 border-blue-600 pb-4">
                  Repository
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium pb-4">
                  Analytics
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium pb-4">
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:block relative">
                <Input
                  type="text"
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-4"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Script
              </Button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                <span>JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ScriptFilters onFiltersChange={setFilters} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <UploadArea />
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading scripts...</div>
              </div>
            ) : (
              <ScriptList 
                scripts={scripts} 
                onScriptSelect={handleScriptSelect}
              />
            )}
          </div>
        </div>
      </div>

      {/* Code Editor Modal */}
      <CodeEditor
        script={selectedScript}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />
    </div>
  );
}
