/**
 * Stockyard API types (stub for future implementation)
 */

export interface StockyardConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
}

export interface StockyardAgentMetadata {
  name: string;
  description: string;
  versions: Array<{
    version: string;
    released: string;
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
    changelog_url?: string;
  }>;
  latest: string;
  stockyard: {
    author: string;
    license: string;
    homepage: string;
    repository: string;
    downloads: number;
    rating: number;
    tags: string[];
  };
}

export interface StockyardToolMetadata {
  name: string;
  description: string;
  versions: Array<{
    version: string;
    released: string;
    status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  }>;
  latest: string;
  stockyard: {
    author: string;
    license: string;
    tags: string[];
  };
}

export interface StockyardSearchResult {
  results: Array<{
    name: string;
    type: 'agent' | 'tool';
    description: string;
    version: string;
    author: string;
    rating: number;
    downloads: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
