'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Network, TrendingUp, FileText, Folder, RefreshCw } from 'lucide-react';

// Dynamically import ForceGraph2D (client-side only)
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  title: string;
  type: string;
  sector: string;
  tags: string[];
  isPortfolioHolding: boolean;
  filePath: string;
  importance: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<string, number>;
    portfolioHoldings: number;
    sectors: Record<string, number>;
    orphanedNodes: number;
  };
}

interface SearchResult {
  query: string;
  results: GraphNode[];
  count: number;
}

export default function KnowledgePage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const graphRef = useRef<any>(null);

  const apiBase = '/api/proxy';

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/knowledge-graph/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/knowledge-graph/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);

        // Highlight first result on graph
        if (data.results.length > 0 && graphRef.current) {
          const node = data.results[0];
          graphRef.current.centerAt(node.x, node.y, 1000);
          graphRef.current.zoom(3, 1000);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(3, 1000);
    }
  }, []);

  const getNodeColor = (node: GraphNode) => {
    if (node.isPortfolioHolding) return '#10b981'; // Green - Portfolio
    if (node.type === 'concept') return '#3b82f6'; // Blue - Concept
    if (node.type === 'thesis') return '#f59e0b'; // Orange - Thesis
    if (node.type === 'entity') return '#8b5cf6'; // Purple - Entity
    return '#6b7280'; // Gray - Other
  };

  const getNodeSize = (node: GraphNode) => {
    if (node.isPortfolioHolding) return 8;
    if (node.importance > 5) return 6;
    if (node.importance > 2) return 4;
    return 3;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Building knowledge graph from 353 wiki files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-2">
            Visual exploration of {graphData?.stats.totalNodes || 0} wiki entities
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search wiki (companies, concepts, frameworks...)"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(searchQuery);
              }}
            />
          </div>
          <Button onClick={() => handleSearch(searchQuery)}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button variant="outline" onClick={fetchGraph}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rebuild
          </Button>
        </div>

        <Tabs defaultValue="graph" className="space-y-4">
          <TabsList>
            <TabsTrigger value="graph">Graph View</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="search">Search Results</TabsTrigger>
          </TabsList>

          {/* Graph View */}
          <TabsContent value="graph">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Graph Canvas */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Network Visualization</CardTitle>
                  <CardDescription>
                    {graphData?.stats.totalNodes} nodes, {graphData?.stats.totalEdges} connections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    {graphData && (
                      <ForceGraph2D
                        ref={graphRef}
                        graphData={{ nodes: graphData.nodes, links: graphData.edges }}
                        nodeLabel={(node: any) => node.title}
                        nodeColor={(node: any) => getNodeColor(node)}
                        nodeVal={(node: any) => getNodeSize(node)}
                        linkColor={() => '#4b5563'}
                        linkWidth={1}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#000000"
                      />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Portfolio Holdings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Concepts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm">Theses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm">Entities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-sm">Other</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Node Details Sidebar */}
              <Card>
                <CardHeader>
                  <CardTitle>Node Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedNode ? (
                    <ScrollArea className="h-[550px]">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-bold text-lg">{selectedNode.title}</h3>
                          <Badge variant="outline" className="mt-2">{selectedNode.type}</Badge>
                        </div>

                        <div>
                          <p className="text-sm font-medium">Sector</p>
                          <p className="text-sm text-muted-foreground">{selectedNode.sector}</p>
                        </div>

                        {selectedNode.tags.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.tags.map(tag => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium">Importance</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedNode.importance} incoming links
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium">File Path</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {selectedNode.filePath}
                          </p>
                        </div>

                        {selectedNode.isPortfolioHolding && (
                          <div className="p-3 bg-green-500/10 rounded-lg">
                            <p className="text-sm font-medium text-green-600">Portfolio Holding</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center text-muted-foreground py-20">
                      <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Click a node to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="stats">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{graphData?.stats.totalNodes || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{graphData?.stats.totalEdges || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{graphData?.stats.portfolioHoldings || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orphaned Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{graphData?.stats.orphanedNodes || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">No incoming links</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Node Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {Object.entries(graphData?.stats.nodeTypes || {})
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <span className="text-sm">{type}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Sectors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {Object.entries(graphData?.stats.sectors || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 20)
                        .map(([sector, count]) => (
                          <div key={sector} className="flex justify-between items-center">
                            <span className="text-sm">{sector}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Search Results */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                {searchResults && (
                  <CardDescription>
                    Found {searchResults.count} results for "{searchResults.query}"
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {searchResults ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {searchResults.results.map(node => (
                        <div
                          key={node.id}
                          className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => {
                            setSelectedNode(node);
                            // Switch to graph tab
                            document.querySelector('[value="graph"]')?.dispatchEvent(new MouseEvent('click'));
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{node.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{node.sector}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline">{node.type}</Badge>
                                {node.isPortfolioHolding && (
                                  <Badge variant="default" className="bg-green-600">Portfolio</Badge>
                                )}
                              </div>
                            </div>
                            {node.importance > 0 && (
                              <div className="text-right">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{node.importance} links</p>
                              </div>
                            )}
                          </div>

                          {node.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {node.tags.slice(0, 5).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center text-muted-foreground py-20">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Search for companies, concepts, or frameworks</p>
                    <p className="text-sm mt-2">Try: "KEC", "portfolio", "infrastructure", "thesis"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
