import { TOOLSET_DESCRIPTIONS } from "./discover.js";

// Per-toolset MCP server identity (AAPRFE-3082).
//
// One process serves every toolset endpoint (/job_management/mcp, /mcp/discover,
// ...), but each endpoint answers its own `initialize` handshake and is a
// distinct MCP server from the client's point of view. Advertising the same
// serverInfo from all of them makes them indistinguishable in client UIs, which
// list one row per configured endpoint.
//
// The toolset is already resolved per request (RequestContext.toolset, taken
// from the URL path), so the identity is derived from it at McpServer
// construction time. No per-route env injection or operator change is needed.

/** Fallback identity prefix; overridable via MCP_SERVER_NAME. */
export const DEFAULT_SERVER_NAME = "aap";

/** Toolsets that are synthesized rather than declared in aap-mcp.yaml. */
const AGGREGATE_TOOLSET = "all";

export interface ServerIdentity {
  /** Programmatic identifier, e.g. "aap-job-management". */
  name: string;
  /** Human-readable display name preferred by spec-aware clients. */
  title: string;
  version: string;
  /** Omitted when the toolset has no known description. */
  description?: string;
}

export interface ServerIdentityInput {
  /** Toolset resolved from the request path; "all" for the bare /mcp endpoint. */
  toolset: string;
  version: string;
  /**
   * Toolset names the server actually serves. `toolset` comes from an
   * unvalidated path segment (`/:toolset/mcp` matches anything), so anything
   * not in this set falls back to the base identity rather than being
   * reflected back to the client.
   */
  knownToolsets: readonly string[];
  /** Identity prefix, so two AAP instances can be told apart (MCP_SERVER_NAME). */
  baseName?: string;
}

/** "job_management" -> "Job Management" */
const toTitleCase = (toolset: string): string =>
  toolset
    .split(/[_-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** "job_management" -> "job-management" (hyphens read better in client UIs). */
const toNameSegment = (toolset: string): string => toolset.replace(/_/g, "-");

/**
 * Build the serverInfo advertised by the endpoint serving `toolset`.
 *
 * The bare /mcp endpoint (toolset "all") and any unrecognized toolset keep the
 * plain base identity, so existing single-endpoint clients see no change.
 */
export const buildServerIdentity = ({
  toolset,
  version,
  knownToolsets,
  baseName = DEFAULT_SERVER_NAME,
}: ServerIdentityInput): ServerIdentity => {
  const titlePrefix = baseName.toUpperCase();

  if (toolset === AGGREGATE_TOOLSET || !knownToolsets.includes(toolset)) {
    return { name: baseName, title: titlePrefix, version };
  }

  const description = TOOLSET_DESCRIPTIONS[toolset];

  return {
    name: `${baseName}-${toNameSegment(toolset)}`,
    title: `${titlePrefix} ${toTitleCase(toolset)}`,
    version,
    ...(description ? { description } : {}),
  };
};
