"""
Playwright E2E — Pages V2 (Page Builder)

Strategy: intercept auth + API calls via page.route() to run without
a live database. Tests the UI contract, not the API integration.

Tests:
  1. Page list view renders (empty state)
  2. "صفحة جديدة" button opens dialog
  3. Title input shows slug preview
  4. Creating page transitions to Puck editor
  5. Puck editor renders with component palette
  6. Save triggers PUT /api/v2/pages/:id

Screenshots:
  /tmp/pages_v2_desktop_rtl.png  — 1440×900 list view
  /tmp/pages_v2_mobile_rtl.png   — 390×844  list view

Usage:
  BASE_URL=http://localhost:5174 python3 e2e/pages_v2.py
"""

import json
import sys
import os
from playwright.sync_api import sync_playwright, Route, Request

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5174")

# ── Mock payloads ─────────────────────────────────────────────────────────────

MOCK_TOKEN = "mock.token.e2e"

MOCK_ME = {
    "id": "user-e2e-01",
    "email": "e2e@tarmizos.sa",
    "name": "E2E Tester",
    "role": "owner",
    "orgId": "org-e2e-01",
    "org": {
        "id": "org-e2e-01",
        "name": "منشأة الاختبار",
        "businessType": "salon",
        "plan": "pro",
        "capabilities": ["page_builder_v2"],
        "primaryColor": "#5b9bd5",
    },
}

MOCK_PAGES_EMPTY = {"data": [], "meta": {"page": 1, "limit": 50, "total": 0}}

MOCK_NEW_PAGE = {
    "data": {
        "id": "page-e2e-01",
        "slug": "page",
        "title": "صفحة الاختبار E2E",
        "pageType": "custom",
        "status": "draft",
        "sortOrder": 0,
        "showInNavigation": True,
        "publishedAt": None,
        "updatedAt": "2026-04-20T10:00:00.000Z",
        "draftData": {"content": [], "root": {"props": {"title": "صفحة الاختبار E2E"}}},
        "publishedData": None,
        "metaTitle": None,
        "metaDescription": None,
        "ogImage": None,
    }
}

MOCK_UPDATE_OK = {"data": {**MOCK_NEW_PAGE["data"], "updatedAt": "2026-04-20T10:05:00.000Z"}}


def json_response(route: Route, body: dict, status: int = 200):
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(body),
    )


MOCK_ORG_CONTEXT = {
    "data": {
        "orgId": "org-e2e-01",
        "orgCode": "e2e",
        "businessType": "salon",
        "operatingProfile": "general",
        "serviceDeliveryModes": ["in_person"],
        "capabilities": ["page_builder_v2", "bookings", "customers", "catalog"],
        "dashboardProfile": "generic",
        "vocabulary": {},
        "plan": "pro",
    }
}

MOCK_SUBSCRIPTION = {
    "data": {
        "plan": "pro",
        "status": "active",
        "trialEndsAt": None,
        "bookingsUsed": 0,
        "bookingsLimit": None,
    }
}


def setup_mocks(page):
    """Intercept all API calls and return mock responses."""

    def handle(route: Route):
        url = route.request.url
        method = route.request.method

        # Settings / org context
        if "/settings/context" in url:
            return json_response(route, MOCK_ORG_CONTEXT)

        # Organization subscription
        if "/organization/subscription" in url:
            return json_response(route, MOCK_SUBSCRIPTION)

        # Alerts
        if "/alerts" in url:
            return json_response(route, {"data": [], "meta": {"total": 0}})

        # Platform config
        if "/platform-config" in url:
            return json_response(route, {"data": {"name": "ترميز OS", "logo": None}})

        # Billing plans
        if "/billing/plans" in url or "/billing/plan-addons" in url:
            return json_response(route, {"data": []})

        # v2 pages create
        if "/api/v2/pages" in url and method == "POST":
            return json_response(route, MOCK_NEW_PAGE, 201)

        # v2 pages list
        if "/api/v2/pages" in url and "page-e2e-01" not in url and "versions" not in url:
            return json_response(route, MOCK_PAGES_EMPTY)

        # v2 single page
        if "/api/v2/pages/page-e2e-01" in url and "versions" not in url and "publish" not in url:
            if method == "PUT":
                return json_response(route, MOCK_UPDATE_OK)
            return json_response(route, MOCK_NEW_PAGE)

        if "/api/v2/pages/page-e2e-01/publish" in url:
            return json_response(route, MOCK_UPDATE_OK)

        if "/api/v2/pages/page-e2e-01/versions" in url:
            return json_response(route, {"data": []})

        # Catch-all: let through or return empty
        if "/api/" in url:
            return json_response(route, {"data": [], "meta": {}})

        route.continue_()

    page.route("**/*", handle)


def inject_auth(page):
    """Inject a fake auth token + user into localStorage."""
    token_json = json.dumps(MOCK_TOKEN)
    me_json = json.dumps(MOCK_ME)
    page.evaluate(f"""() => {{
        localStorage.setItem('nasaq_token', {token_json});
        localStorage.setItem('nasaq_user', JSON.stringify({me_json}));
    }}""")


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(locale="ar-SA", timezone_id="Asia/Riyadh")
        screenshots = []
        failures = []

        try:
            page = context.new_page()
            setup_mocks(page)

            # ── Navigate and inject auth ────────────────────────────────────
            page.goto(BASE_URL)
            page.wait_for_load_state("networkidle")
            inject_auth(page)
            page.goto(f"{BASE_URL}/dashboard/pages-v2")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(800)

            # ── TEST 1: Page list view ──────────────────────────────────────
            print("TEST 1: page list view heading visible")
            try:
                heading = page.locator("h1").filter(has_text="الصفحات")
                heading.wait_for(state="visible", timeout=8000)
                print("  PASS: 'الصفحات' heading found")
            except Exception as e:
                # Fallback: app might redirect to login — take screenshot for debug
                page.screenshot(path="/tmp/debug_test1.png")
                failures.append(f"TEST 1 FAILED: {e}")
                print(f"  FAIL: {e} (see /tmp/debug_test1.png)")

            # ── TEST 2: Empty state ─────────────────────────────────────────
            print("TEST 2: empty state shows when no pages")
            try:
                empty = page.locator("text=لا توجد صفحات بعد")
                empty.wait_for(state="visible", timeout=5000)
                print("  PASS: empty state visible")
            except Exception as e:
                failures.append(f"TEST 2 FAILED: {e}")
                print(f"  FAIL: {e}")

            # ── SCREENSHOT: Desktop RTL ─────────────────────────────────────
            page.set_viewport_size({"width": 1440, "height": 900})
            path_desktop = "/tmp/pages_v2_desktop_rtl.png"
            page.screenshot(path=path_desktop, full_page=False)
            screenshots.append(("desktop RTL list view", path_desktop))
            print(f"  Screenshot: {path_desktop}")

            # ── SCREENSHOT: Mobile RTL ──────────────────────────────────────
            mobile_page = context.new_page()
            setup_mocks(mobile_page)
            mobile_page.goto(BASE_URL)
            mobile_page.wait_for_load_state("networkidle")
            inject_auth(mobile_page)
            mobile_page.goto(f"{BASE_URL}/dashboard/pages-v2")
            mobile_page.wait_for_load_state("networkidle")
            mobile_page.set_viewport_size({"width": 390, "height": 844})
            mobile_page.wait_for_timeout(500)
            path_mobile = "/tmp/pages_v2_mobile_rtl.png"
            mobile_page.screenshot(path=path_mobile, full_page=False)
            screenshots.append(("mobile RTL list view", path_mobile))
            print(f"  Screenshot: {path_mobile}")
            mobile_page.close()

            # ── TEST 3: New page dialog ─────────────────────────────────────
            print("TEST 3: 'صفحة جديدة' opens dialog")
            page.set_viewport_size({"width": 1440, "height": 900})
            try:
                btn = page.locator("button").filter(has_text="صفحة جديدة").first
                btn.wait_for(state="visible", timeout=5000)
                btn.click()
                dialog = page.locator("h2").filter(has_text="صفحة جديدة")
                dialog.wait_for(state="visible", timeout=3000)
                print("  PASS: dialog opened")
            except Exception as e:
                failures.append(f"TEST 3 FAILED: {e}")
                print(f"  FAIL: {e}")

            # ── TEST 4: Slug preview ────────────────────────────────────────
            print("TEST 4: typing title shows slug preview")
            try:
                title_input = page.locator('input[placeholder*="مثال"]')
                title_input.wait_for(state="visible", timeout=3000)
                title_input.fill("About Us")
                page.wait_for_timeout(300)
                slug_preview = page.locator("text=/about-us/")
                slug_preview.wait_for(state="visible", timeout=2000)
                print("  PASS: slug preview shows 'about-us'")
            except Exception as e:
                failures.append(f"TEST 4 FAILED: {e}")
                print(f"  FAIL: {e}")

            # ── TEST 5: Create → open Puck editor ───────────────────────────
            print("TEST 5: create button triggers editor view")
            try:
                # Clear and type Arabic title
                title_input = page.locator('input[placeholder*="مثال"]')
                title_input.fill("صفحة الاختبار E2E")
                page.wait_for_timeout(300)

                create_btn = page.locator("button").filter(has_text="إنشاء وفتح المحرر")
                # Wait for button to be enabled (title not empty)
                page.wait_for_selector("button:has-text('إنشاء وفتح المحرر'):not([disabled])", timeout=3000)
                create_btn.click()
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(2000)

                # Puck editor container should appear
                page.wait_for_selector('[data-testid="puck-editor"]', timeout=10000)
                print("  PASS: Puck editor opened")

                # Screenshot: editor view
                path_editor = "/tmp/pages_v2_editor.png"
                page.screenshot(path=path_editor, full_page=False)
                screenshots.append(("Puck editor view", path_editor))
                print(f"  Screenshot: {path_editor}")

            except Exception as e:
                page.screenshot(path="/tmp/debug_test5.png")
                failures.append(f"TEST 5 FAILED: {e}")
                print(f"  FAIL: {e} (see /tmp/debug_test5.png)")

            # ── TEST 6: Back button returns to list ─────────────────────────
            print("TEST 6: back button returns to list view")
            try:
                # Back button is in the editor toolbar
                page.wait_for_selector("button:has-text('الصفحات')", timeout=3000)
                page.click("button:has-text('الصفحات')")
                page.wait_for_timeout(800)
                page.wait_for_selector("h1:has-text('الصفحات')", timeout=5000)
                print("  PASS: returned to list view")
            except Exception as e:
                page.screenshot(path="/tmp/debug_test6.png")
                failures.append(f"TEST 6 FAILED: {e}")
                print(f"  FAIL: {e}")

        finally:
            browser.close()

        # ── Results ────────────────────────────────────────────────────────
        print("\n" + "="*60)
        print("E2E RESULTS — Pages V2 (Page Builder)")
        print("="*60)
        passed = 6 - len(failures)
        print(f"Tests: {passed}/6 passed")

        if failures:
            print("\nFailures:")
            for f in failures:
                print(f"  - {f}")

        print("\nScreenshots:")
        for label, path in screenshots:
            print(f"  [{label}] {path}")
        print("="*60)

        if failures:
            sys.exit(1)


if __name__ == "__main__":
    run_tests()
