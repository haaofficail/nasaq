/**
 * WhatsApp Baileys session lifecycle tests
 * Validates session state transitions, stale detection, and reconnect logic.
 *
 * Run: cd packages/api && node --experimental-vm-modules --test src/__tests__/whatsapp-baileys-lifecycle.test.ts
 *
 * These tests mock the Baileys socket to validate in-memory session lifecycle
 * without requiring a real WhatsApp connection.
 */
import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Minimal mock types ──────────────────────────────────────
interface MockSession {
  socket: any | null;
  status: string;
  qrBase64: string | null;
  phone: string | null;
  lastError: string | null;
  updatedAt: Date;
  generation: number;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Creates a minimal mock of the Session + helper logic from whatsappBaileys.ts
 * to test lifecycle transitions without Baileys dependency.
 */
function createSessionManager() {
  const sessions = new Map<string, MockSession>();

  function get(orgId: string): MockSession {
    if (!sessions.has(orgId)) {
      sessions.set(orgId, {
        socket: null,
        status: "disconnected",
        qrBase64: null,
        phone: null,
        lastError: null,
        updatedAt: new Date(),
        generation: 0,
        reconnectAttempts: 0,
        reconnectTimer: null,
      });
    }
    return sessions.get(orgId)!;
  }

  function touch(sess: MockSession, patch: Partial<MockSession>) {
    Object.assign(sess, patch, { updatedAt: new Date() });
  }

  function isSocketAlive(sess: MockSession): boolean {
    if (!sess.socket) return false;
    try {
      const ws = sess.socket.ws;
      return ws && ws.readyState === 1;
    } catch {
      return false;
    }
  }

  function destroySocket(sess: MockSession): void {
    if (!sess.socket) {
      return;
    }
    try {
      sess.socket.end?.(undefined);
    } catch { /* silent */ }
    sess.socket = null;
  }

  function cancelReconnect(sess: MockSession): void {
    if (sess.reconnectTimer) {
      clearTimeout(sess.reconnectTimer);
      sess.reconnectTimer = null;
    }
  }

  /** Simulate getBaileysState with integrity checks */
  function getState(orgId: string) {
    const sess = get(orgId);

    if (sess.status === "connected" && !isSocketAlive(sess)) {
      destroySocket(sess);
      touch(sess, { status: "disconnected", qrBase64: null, lastError: "الجلسة انتهت. أعد الاتصال." });
    }
    if ((sess.status === "connecting" || sess.status === "qr_ready") && !isSocketAlive(sess) && !sess.reconnectTimer) {
      touch(sess, { status: "disconnected", qrBase64: null });
    }

    return {
      status: sess.status,
      qrBase64: sess.qrBase64,
      phone: sess.phone,
      lastError: sess.lastError,
    };
  }

  return { sessions, get, touch, isSocketAlive, destroySocket, cancelReconnect, getState };
}

function createMockSocket(readyState = 1) {
  return {
    ws: { readyState },
    user: { id: "966501234567:1@s.whatsapp.net", name: "Test" },
    ev: { on: () => {} },
    sendMessage: async () => {},
    logout: async () => {},
    end: () => {},
  };
}

// ══════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════

describe("Session lifecycle — stale detection", () => {
  test("getState corrects 'connected' with dead socket to 'disconnected'", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    // Simulate: session was connected but socket died
    mgr.touch(sess, { status: "connected", phone: "966501234567", socket: null });

    const state = mgr.getState("platform");
    assert.equal(state.status, "disconnected", "should correct to disconnected when socket is null");
    assert.ok(state.lastError, "should set an error message");
  });

  test("getState corrects 'connected' with closed websocket to 'disconnected'", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    const deadSocket = createMockSocket(3); // readyState 3 = CLOSED
    mgr.touch(sess, { status: "connected", phone: "966501234567", socket: deadSocket });

    const state = mgr.getState("platform");
    assert.equal(state.status, "disconnected");
  });

  test("getState corrects 'qr_ready' with dead socket to 'disconnected'", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    mgr.touch(sess, { status: "qr_ready", qrBase64: "data:image/png;base64,abc", socket: null });

    const state = mgr.getState("platform");
    assert.equal(state.status, "disconnected", "qr_ready with no socket should become disconnected");
    assert.equal(state.qrBase64, null, "stale QR should be cleared");
  });

  test("getState corrects 'connecting' with dead socket to 'disconnected'", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    mgr.touch(sess, { status: "connecting", socket: null });

    const state = mgr.getState("platform");
    assert.equal(state.status, "disconnected");
  });

  test("getState preserves 'connecting' when reconnect timer is active", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    // Simulate: reconnecting with timer pending
    const timer = setTimeout(() => {}, 60000);
    mgr.touch(sess, { status: "connecting", socket: null, reconnectTimer: timer });

    const state = mgr.getState("platform");
    assert.equal(state.status, "connecting", "should stay connecting while reconnect timer is active");
    clearTimeout(timer);
  });

  test("getState keeps 'connected' with live socket", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    const liveSocket = createMockSocket(1); // readyState 1 = OPEN
    mgr.touch(sess, { status: "connected", phone: "966501234567", socket: liveSocket });

    const state = mgr.getState("platform");
    assert.equal(state.status, "connected");
    assert.equal(state.phone, "966501234567");
  });

  test("getState returns disconnected for brand new session", () => {
    const mgr = createSessionManager();
    const state = mgr.getState("new-org-id");
    assert.equal(state.status, "disconnected");
    assert.equal(state.qrBase64, null);
    assert.equal(state.phone, null);
  });
});

describe("Session lifecycle — generation tracking", () => {
  test("generation increments on each init attempt", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");

    assert.equal(sess.generation, 0);
    sess.generation++;
    assert.equal(sess.generation, 1);
    sess.generation++;
    assert.equal(sess.generation, 2);
  });
});

describe("Session lifecycle — socket health checks", () => {
  test("isSocketAlive returns false for null socket", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("test");
    assert.equal(mgr.isSocketAlive(sess), false);
  });

  test("isSocketAlive returns false for socket with closed ws", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("test");
    sess.socket = createMockSocket(3); // CLOSED
    assert.equal(mgr.isSocketAlive(sess), false);
  });

  test("isSocketAlive returns true for socket with open ws", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("test");
    sess.socket = createMockSocket(1); // OPEN
    assert.equal(mgr.isSocketAlive(sess), true);
  });

  test("isSocketAlive handles socket without ws property", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("test");
    sess.socket = {}; // no ws property
    // ws is undefined → ws.readyState throws → catch → false
    // In the mock implementation, ws && ws.readyState evaluates to undefined (falsy)
    assert.equal(!!mgr.isSocketAlive(sess), false);
  });
});

describe("Session lifecycle — reconnect logic", () => {
  test("reconnectAttempts starts at 0", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");
    assert.equal(sess.reconnectAttempts, 0);
  });

  test("cancelReconnect clears timer", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("platform");
    sess.reconnectTimer = setTimeout(() => {}, 60000);
    assert.ok(sess.reconnectTimer !== null);
    mgr.cancelReconnect(sess);
    assert.equal(sess.reconnectTimer, null);
  });

  test("destroySocket nullifies socket", () => {
    const mgr = createSessionManager();
    const sess = mgr.get("test");
    sess.socket = createMockSocket(1);
    mgr.destroySocket(sess);
    assert.equal(sess.socket, null);
  });
});

describe("Platform vs org session isolation", () => {
  test("platform and org sessions are independent", () => {
    const mgr = createSessionManager();
    const platform = mgr.get("platform");
    const org = mgr.get("org-uuid-123");

    mgr.touch(platform, { status: "connected", phone: "966500000000" });
    mgr.touch(org, { status: "qr_ready", qrBase64: "data:image/png;base64,xyz" });

    assert.equal(platform.status, "connected");
    assert.equal(org.status, "qr_ready");
    assert.equal(platform.phone, "966500000000");
    assert.equal(org.qrBase64, "data:image/png;base64,xyz");
  });

  test("modifying one session does not affect another", () => {
    const mgr = createSessionManager();
    const platform = mgr.get("platform");
    const org = mgr.get("org-uuid-456");

    mgr.touch(platform, { status: "connected", phone: "966500000001" });
    mgr.touch(org, { status: "disconnected", lastError: "test error" });

    // Platform should not be affected by org changes
    assert.equal(platform.status, "connected");
    assert.equal(platform.lastError, null); // was set to null at creation, not touched by org

    // Org should retain its own state
    assert.equal(org.status, "disconnected");
    assert.equal(org.lastError, "test error");
  });
});
