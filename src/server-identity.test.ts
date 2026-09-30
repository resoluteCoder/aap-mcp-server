import { describe, it, expect } from "vitest";
import { buildServerIdentity, DEFAULT_SERVER_NAME } from "./server-identity.js";

const KNOWN_TOOLSETS = [
  "job_management",
  "inventory_management",
  "system_monitoring",
  "user_management",
  "security_compliance",
  "platform_configuration",
  "content_discovery",
  "discover",
  "all",
];

const build = (toolset: string, baseName?: string) =>
  buildServerIdentity({
    toolset,
    version: "1.2.3",
    knownToolsets: KNOWN_TOOLSETS,
    ...(baseName !== undefined ? { baseName } : {}),
  });

describe("buildServerIdentity", () => {
  it("derives a distinct name and title per toolset", () => {
    expect(build("job_management")).toEqual({
      name: "aap-job-management",
      title: "AAP Job Management",
      version: "1.2.3",
      description:
        "Launch, monitor, and manage jobs, job templates, workflows, and schedules",
    });
  });

  it("gives every configured toolset a unique name", () => {
    const names = KNOWN_TOOLSETS.map((toolset) => build(toolset).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps the bare /mcp endpoint on the unsuffixed base identity", () => {
    // Backwards compatibility: single-endpoint clients pointed at /mcp should
    // see exactly what they saw before this change.
    expect(build("all")).toEqual({
      name: DEFAULT_SERVER_NAME,
      title: "AAP",
      version: "1.2.3",
    });
  });

  it("names the discover endpoint", () => {
    const identity = build("discover");
    expect(identity.name).toBe("aap-discover");
    expect(identity.title).toBe("AAP Discover");
  });

  it("omits description for a toolset with no known description", () => {
    const identity = buildServerIdentity({
      toolset: "custom_toolset",
      version: "1.2.3",
      knownToolsets: ["custom_toolset"],
    });
    expect(identity).toEqual({
      name: "aap-custom-toolset",
      title: "AAP Custom Toolset",
      version: "1.2.3",
    });
    expect(identity).not.toHaveProperty("description");
  });

  it("applies the configured base name as a prefix", () => {
    expect(build("job_management", "aap-prod")).toMatchObject({
      name: "aap-prod-job-management",
      title: "AAP-PROD Job Management",
    });
  });

  // `/:toolset/mcp` matches any path segment, so the toolset is unvalidated
  // client input. It must never be reflected into serverInfo verbatim.
  describe("unknown toolsets", () => {
    it("falls back to the base identity", () => {
      expect(build("does_not_exist")).toEqual({
        name: DEFAULT_SERVER_NAME,
        title: "AAP",
        version: "1.2.3",
      });
    });

    it.each([
      ["<script>alert(1)</script>"],
      ["../../etc/passwd"],
      ["a".repeat(500)],
    ])("does not reflect %s back to the client", (hostile) => {
      const identity = build(hostile);
      expect(identity.name).toBe(DEFAULT_SERVER_NAME);
      expect(identity.title).toBe("AAP");
      expect(JSON.stringify(identity)).not.toContain(hostile.slice(0, 20));
    });

    it("falls back on an empty toolset segment", () => {
      expect(build("").name).toBe(DEFAULT_SERVER_NAME);
    });
  });

  it("reports the version it is given", () => {
    expect(build("job_management").version).toBe("1.2.3");
  });
});
