const args = process.argv.slice(2);
const publicOnly = args.includes("--public-only");
const suppliedBase = args.find((value) => !value.startsWith("--"));
const baseUrl = new URL(suppliedBase || process.env.PILOT_BASE_URL || "http://localhost:3000");
const failures = [];

async function request(path) {
  const url = new URL(path, baseUrl);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "SisterCare-Pilot-Smoke/1.0" },
    });
    return { response, durationMs: Date.now() - startedAt };
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : "request failed"}`);
    return null;
  }
}

async function checkPage(path, options = {}) {
  const result = await request(path);
  if (!result) return;
  const { response, durationMs } = result;
  const allowed = options.allowedStatus || [200];
  if (!allowed.includes(response.status)) failures.push(`${path}: expected ${allowed.join("/")}, received ${response.status}`);
  if (options.html !== false && response.status === 200 && !response.headers.get("content-type")?.includes("text/html")) failures.push(`${path}: expected HTML content`);
  if (options.privatePage && !response.headers.get("cache-control")?.includes("no-store")) failures.push(`${path}: private page is missing Cache-Control no-store`);
  const csp = response.headers.get("content-security-policy-report-only");
  if (response.status === 200 && !csp?.includes("default-src 'self'")) failures.push(`${path}: content security policy reporting is missing`);
  if (baseUrl.protocol === "https:" && response.status === 200 && !response.headers.get("strict-transport-security")) failures.push(`${path}: HSTS is missing`);
  console.log(`PASS ${path} ${response.status} ${durationMs}ms`);
}

for (const path of ["/", "/auth/login", "/privacy", "/terms", "/help", "/pilot-paused"]) {
  await checkPage(path);
}
await checkPage("/chat", { privatePage: true });

const health = await request("/api/health");
if (health) {
  const body = await health.response.json().catch(() => null);
  const expectedChecks = ["security", "database", "clinicalGovernance", "maintenance", "pilotAccess"];
  if (!body || body.service !== "sistercare" || !body.checks) {
    failures.push("/api/health: invalid health payload");
  } else {
    for (const key of expectedChecks) {
      if (typeof body.checks[key] !== "boolean") failures.push(`/api/health: missing ${key} check`);
    }
    if (!publicOnly && (health.response.status !== 200 || body.status !== "ready" || expectedChecks.some((key) => body.checks[key] !== true))) {
      failures.push(`/api/health: pilot is not ready (${JSON.stringify(body.checks)})`);
    }
    if (publicOnly && ![200, 503].includes(health.response.status)) failures.push(`/api/health: unexpected status ${health.response.status}`);
  }
  console.log(`${publicOnly ? "INFO" : "PASS"} /api/health ${health.response.status} ${health.durationMs}ms`);
}

if (failures.length) {
  console.error("\nPilot smoke checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nPilot smoke checks passed for ${baseUrl.origin}${publicOnly ? " (public-only mode)" : ""}.`);
}
