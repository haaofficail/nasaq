/**
 * verifyMoyasarSignature — Pure function tests (Phase 3.C Step 2.1)
 *
 * يُثبت:
 * 1. Bug: re-serialized JSON ينتج signature مختلف → رفض webhook صحيح
 * 2. Fix: raw body يُنتج signature صحيح
 * 3. Timing safe: forged signature بنفس الطول يُرفض بدون timing leak
 * 4. Wrong length: signature بطول مختلف → false بدون crash
 */

import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMoyasarSignature } from "../../lib/moyasar-webhook";

const SECRET = "test-shared-secret-moyasar-32ch";

// ════════════════════════════════════════════════════════════════
// Test 1 — يُثبت البـug
// ════════════════════════════════════════════════════════════════

describe("verifyMoyasarSignature — bug demonstration", () => {
  it("re-serialized JSON يُنتج signature مختلف عن raw body", () => {
    // Moyasar وقّع هذا الـ raw body كما وصل (مع spaces)
    const rawBody = '{ "id": "pay_abc123",  "status": "paid",  "amount": 50000 }';
    const sigOnRaw = createHmac("sha256", SECRET).update(rawBody).digest("hex");

    // الكود الحالي: JSON.parse ثم JSON.stringify يحذف الـ spaces
    const reSerialized = JSON.stringify(JSON.parse(rawBody));

    // يُثبت أن الـ re-serialized body يختلف عن raw
    expect(reSerialized).not.toBe(rawBody);

    // verifyMoyasarSignature مع re-serialized يفشل في التحقق من الـ signature الصحيح
    expect(verifyMoyasarSignature(reSerialized, sigOnRaw, SECRET)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// Test 2 — الـ fix: raw body يمر
// ════════════════════════════════════════════════════════════════

describe("verifyMoyasarSignature — correct verification", () => {
  it("يتحقق صحيح من webhook عند استخدام raw body", () => {
    const rawBody = '{ "id": "pay_abc123",  "status": "paid",  "amount": 50000 }';
    const signature = createHmac("sha256", SECRET).update(rawBody).digest("hex");

    expect(verifyMoyasarSignature(rawBody, signature, SECRET)).toBe(true);
  });

  it("يتحقق من raw body يحتوي unicode و newlines", () => {
    const rawBody = '{"id":"pay_456","description":"حجز موعد\\nتجميل"}\n';
    const signature = createHmac("sha256", SECRET).update(rawBody).digest("hex");

    expect(verifyMoyasarSignature(rawBody, signature, SECRET)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Test 3 — timing attack: signature مزوّرة بنفس الطول
// ════════════════════════════════════════════════════════════════

describe("verifyMoyasarSignature — timing safe comparison", () => {
  it("يرفض signature مزوّرة بنفس الطول بدون timing leak", () => {
    const rawBody = '{"id":"pay_abc123"}';
    const validSig = createHmac("sha256", SECRET).update(rawBody).digest("hex");
    // نفس الطول (64 chars) — محتوى مختلف
    const forgedSig = "a".repeat(validSig.length);

    expect(verifyMoyasarSignature(rawBody, forgedSig, SECRET)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// Test 4 — wrong length: لا crash
// ════════════════════════════════════════════════════════════════

describe("verifyMoyasarSignature — edge cases", () => {
  it("يرجع false لـ signature بطول مختلف بدون crash", () => {
    const rawBody = '{"id":"pay_abc123"}';
    expect(verifyMoyasarSignature(rawBody, "tooshort", SECRET)).toBe(false);
  });

  it("يرجع false لـ signature فارغة", () => {
    const rawBody = '{"id":"pay_abc123"}';
    expect(verifyMoyasarSignature(rawBody, "", SECRET)).toBe(false);
  });
});
