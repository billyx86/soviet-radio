// CI guard for startup.sh's port-busy handling (issue #18).
//
// The check must not claim "soviet-radio is up" just because *something*
// answers on the port — it must verify the response actually carries the
// app's marker (the "Soviet Radio" title in index.html, present in both
// dev and production builds). A foreign service on the port must yield a
// notice saying the radio was NOT started, and a non-zero exit so
// orchestrators don't treat "something else owns the port" as success.
//
// The tests run the real script (sh startup.sh) against a stub HTTP
// responder on an ephemeral port via the SOVIET_RADIO_PORT override, so
// they never touch the machine's real :8080.

import { test, expect } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = path.join(root, "startup.sh");

/** Start an HTTP server on 127.0.0.1:<ephemeral> answering every request with the given body. */
function stubResponder(html: string): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr === "object" && addr !== null) {
        resolve({
          port: addr.port,
          close: () =>
            new Promise<void>((r) => {
              server.close(() => r());
            }),
        });
      } else {
        reject(new Error("stub server has no address"));
      }
    });
  });
}

/** Run the real startup.sh pointed at the given port; it must exit before the npm section. */
function runStartup(port: number): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", [script], {
      cwd: root,
      env: {
        ...process.env,
        SOVIET_RADIO_PORT: String(port),
        SOVIET_RADIO_LOG: "/dev/null",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.stderr.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, out: Buffer.concat(chunks).toString() }));
  });
}

test("port held by a foreign service: does not claim soviet-radio is up, exits 1 (issue #18)", async () => {
  const { port, close } = await stubResponder(
    "<!doctype html><html><head><title>llama-swap dashboard</title></head><body>unrelated service</body></html>"
  );
  try {
    const { code, out } = await runStartup(port);
    expect(code, `expected exit 1, got ${code}\noutput: ${out}`).toBe(1);
    expect(out).not.toMatch(/assuming soviet-radio is up/i);
    expect(out).not.toMatch(/soviet-radio is (already )?up/i);
    expect(out).toMatch(/unknown service/i);
    expect(out).toMatch(/was NOT started/i);
    expect(out).toMatch(new RegExp(String(port)));
  } finally {
    await close();
  }
});

test("port held by the app itself (marker present): reports already up, exits 0 (issue #18)", async () => {
  // Same title the real index.html carries, in both dev and prod builds.
  const { port, close } = await stubResponder(
    '<!doctype html><html lang="ru"><head><meta charset="UTF-8"/><title>Радио Маяк — Soviet Radio</title></head><body><div id="root"></div></body></html>'
  );
  try {
    const { code, out } = await runStartup(port);
    expect(code, `expected exit 0, got ${code}\noutput: ${out}`).toBe(0);
    expect(out).toMatch(/soviet-radio is (already )?up/i);
    expect(out).not.toMatch(/was NOT started/i);
  } finally {
    await close();
  }
});
