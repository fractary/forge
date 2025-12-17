/**
 * Resolvers for Forge SDK
 */

export { ResolverManager, createResolverManager } from './manager';
export type { ResolverOptions, IResolver } from './manager';

export { GitHubResolver } from './github';
export type { GitHubResolverOptions } from './github';

export { CatalogResolver } from './catalog';
export type { Catalog, CatalogEntry } from './catalog';

export { LocalResolver } from './local';
export type { LocalResolverOptions } from './local';
