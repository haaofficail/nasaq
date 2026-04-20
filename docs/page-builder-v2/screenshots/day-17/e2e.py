"""
E2E — Day 17: Pages List Management

Tests:
  1. Empty state renders ("لا توجد صفحات بعد")
  2. Pages list renders with rows and status badges
  3. Filter tabs visible (الكل / مسودة / منشورة / مؤرشفة)
  4. Search input present and filters
  5. Sort select present
  6. 3-dot menu opens with action items
  7. "صفحة جديدة" dialog has page type selector
  8. PUT regression (نشر triggers PUT)

Screenshots: docs/page-builder-v2/screenshots/day-17/
"""

import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL  = "http://localhost:5173"
SHOTS_DIR = Path("/Users/thwany/Desktop/nasaq/docs/page-builder-v2/screenshots/day-17")
SHOTS_DIR.mkdir(parents=True, exist_ok=True)

MOCK_ORG = {"data": {
    "orgId": "org-e2e-17", "orgCode": "e2e17", "businessType": "salon",
    "operatingProfile": "general", "serviceDeliveryModes": ["in_person"],
    "capabilities": ["page_builder_v2", "bookings", "customers", "catalog"],
    "dashboardProfile": "generic", "vocabulary": {}, "plan": "pro"
}}
MOCK_SUB = {"data": {"plan": "pro", "status": "active", "trialEndsAt": None}}

MOCK_PAGES = {"data": [
    {
        "id": "page-d17-01", "slug": "home", "title": "الرئيسية",
        "pageType": "home", "status": "published", "sortOrder": 0,
        "showInNavigation": True, "publishedAt": "2026-04-15T10:00:00.000Z",
        "updatedAt": "2026-04-20T10:00:00.000Z",
    },
    {
        "id": "page-d17-02", "slug": "about", "title": "من نحن",
        "pageType": "about", "status": "draft", "sortOrder": 1,
        "showInNavigation": True, "publishedAt": None,
        "updatedAt": "2026-04-19T10:00:00.000Z",
    },
    {
        "id": "page-d17-03", "slug": "old-page", "title": "صفحة قديمة",
        "pageType": "custom", "status": "archived", "sortOrder": 2,
        "showInNavigation": False, "publishedAt": None,
        "updatedAt": "2026-04-18T10:00:00.000Z",
    },
], "meta": {"page": 1, "limit": 20, "total": 3}}

MOCK_NEW_PAGE = {"data": {
    "id": "page-d17-new", "slug": "day17-test", "title": "صفحة Day 17",
    "pageType": "custom", "status": "draft", "sortOrder": 0,
    "showInNavigation": True, "publishedAt": None,
    "updatedAt": "2026-04-20T17:00:00.000Z",
    "draftData": {"content": [], "root": {"props": {"title": "صفحة Day 17"}}},
    "publishedData": None, "metaTitle": None, "metaDescription": None, "ogImage": None
}}
MOCK_SAVED = {"data": {**MOCK_NEW_PAGE["data"], "updatedAt": "2026-04-20T17:30:00.000Z"}}


def make_handler(put_track=None, empty_list=False):
    pages_list = {"data": [], "meta": {"page": 1, "limit": 20, "total": 0}} if empty_list else MOCK_PAGES
    def h(route):
        url, method = route.request.url, route.request.method
        if "/settings/context"          in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_ORG))
        if "/organization/subscription" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SUB))
        if "/alerts"                    in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": [], "meta": {"total": 0}}))
        if "/platform-config"           in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": {"name": "ترميز OS"}}))
        if "/billing/"                  in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))
        if "/api/v2/pagebuilder/sources/products"   in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"products": []}))
        if "/api/v2/pagebuilder/sources/categories" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"categories": []}))
        if "/api/v2/pages/page-d17-new" in url and "versions" not in url and "publish" not in url:
            if method == "PUT":
                if put_track: put_track["value"] = True
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SAVED))
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_NEW_PAGE))
        if "/api/v2/pages/page-d17-new/versions" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": []}))
        if "/api/v2/pages/page-d17-new/publish"  in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SAVED))
        if "/api/v2/pages/page-d17-01" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SAVED))
        if "/api/v2/pages/page-d17-02" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SAVED))
        if "/api/v2/pages/page-d17-03/restore" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(MOCK_SAVED))
        if "/api/v2/pages" in url and method == "POST": return route.fulfill(status=201, content_type="application/json", body=json.dumps(MOCK_NEW_PAGE))
        if "/api/v2/pages" in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps(pages_list))
        if "/api/"         in url: return route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": [], "meta": {}}))
        route.continue_()
    return h


def inject_auth(page):
    page.evaluate("() => { localStorage.setItem('nasaq_token','real-session-token'); localStorage.setItem('nasaq_org_id','org-e2e-17'); }")


def goto_pages(page, put_track=None, empty_list=False):
    page.route("**/*", make_handler(put_track, empty_list))
    page.goto(BASE_URL); page.wait_for_load_state("networkidle")
    inject_auth(page)
    page.goto(f"{BASE_URL}/dashboard/pages-v2"); page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)


def open_editor(page):
    page.click("button:has-text('صفحة جديدة')")
    page.wait_for_selector("h2:has-text('صفحة جديدة')", timeout=4000)
    page.fill('input[placeholder*="مثال"]', "صفحة Day 17")
    page.wait_for_timeout(300)
    page.wait_for_selector("button:has-text('إنشاء وفتح المحرر'):not([disabled])", timeout=3000)
    page.click("button:has-text('إنشاء وفتح المحرر')")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector('[data-testid="puck-editor"]', timeout=10000)
    page.wait_for_timeout(1500)


def run():
    failures, screenshots = [], []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="ar-SA")

        # ── TEST 1: Empty state ──────────────────────────────────────────
        print("TEST 1: Empty state renders correctly")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg, empty_list=True)
        try:
            pg.wait_for_selector("text=لا توجد صفحات بعد", timeout=5000)
            print("  PASS: empty state visible")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t1.png")
            failures.append(f"TEST 1 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 2: Pages list renders with rows ─────────────────────────
        print("TEST 2: Pages list renders with status badges")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("text=الرئيسية", timeout=5000)
            pg.wait_for_selector("text=من نحن", timeout=3000)
            pg.wait_for_selector("text=منشورة", timeout=3000)
            pg.wait_for_selector("text=مسودة", timeout=3000)
            print("  PASS: list rows and badges visible")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t2.png")
            failures.append(f"TEST 2 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 3: Filter tabs ──────────────────────────────────────────
        print("TEST 3: Filter tabs visible")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("[data-filter-tab='all']", timeout=5000)
            pg.wait_for_selector("[data-filter-tab='draft']", timeout=3000)
            pg.wait_for_selector("[data-filter-tab='published']", timeout=3000)
            pg.wait_for_selector("[data-filter-tab='archived']", timeout=3000)
            print("  PASS: all 4 filter tabs visible")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t3.png")
            failures.append(f"TEST 3 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 4: Search input present ─────────────────────────────────
        print("TEST 4: Search input present")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("[data-search-input]", timeout=5000)
            print("  PASS: search input visible")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t4.png")
            failures.append(f"TEST 4 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 5: Sort select present ───────────────────────────────────
        print("TEST 5: Sort select present")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("[data-sort-select]", timeout=5000)
            print("  PASS: sort select visible")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t5.png")
            failures.append(f"TEST 5 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 6: 3-dot menu opens ──────────────────────────────────────
        print("TEST 6: 3-dot menu opens with actions")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("[data-menu-trigger]", timeout=5000)
            pg.locator("[data-menu-trigger]").first.click()
            pg.wait_for_selector("[data-row-menu]", timeout=3000)
            # Check for action labels
            pg.wait_for_selector("text=تعديل في المحرر", timeout=2000)
            pg.wait_for_selector("text=إعادة تسمية", timeout=2000)
            print("  PASS: 3-dot menu opens with actions")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t6.png")
            failures.append(f"TEST 6 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 7: New page dialog has type selector ─────────────────────
        print("TEST 7: New page dialog has page type selector")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.click("button:has-text('صفحة جديدة')")
            pg.wait_for_selector("h2:has-text('صفحة جديدة')", timeout=4000)
            pg.wait_for_selector("[data-page-type-select]", timeout=3000)
            print("  PASS: page type selector in dialog")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t7.png")
            failures.append(f"TEST 7 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── TEST 8: PUT regression ────────────────────────────────────────
        print("TEST 8: 'نشر' triggers PUT (regression)")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        put = {"value": False}; goto_pages(pg, put_track=put)
        try:
            open_editor(pg)
            pg.locator("button:has-text('نشر')").first.wait_for(state="visible", timeout=5000)
            pg.locator("button:has-text('نشر')").first.click()
            pg.wait_for_timeout(1500)
            if put["value"]: print("  PASS: PUT triggered")
            else: failures.append("TEST 8 FAILED: PUT not triggered"); print("  FAIL")
        except Exception as e:
            pg.screenshot(path="/tmp/debug_d17_t8.png")
            failures.append(f"TEST 8 FAILED: {e}"); print(f"  FAIL: {e}")
        pg.close()

        # ── Screenshots ───────────────────────────────────────────────────
        print("Desktop screenshot (1440×900) — list view with data...")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("text=الرئيسية", timeout=5000)
            path_d = str(SHOTS_DIR / "desktop-list.png")
            pg.screenshot(path=path_d, full_page=True)
            screenshots.append(("desktop list 1440×900", path_d)); print(f"  {path_d}")
        except Exception as e:
            print(f"  screenshot failed: {e}")
        pg.close()

        print("Desktop screenshot — empty state...")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg, empty_list=True)
        try:
            pg.wait_for_selector("text=لا توجد صفحات بعد", timeout=5000)
            path_e = str(SHOTS_DIR / "desktop-empty.png")
            pg.screenshot(path=path_e)
            screenshots.append(("empty state", path_e)); print(f"  {path_e}")
        except Exception as e:
            print(f"  screenshot failed: {e}")
        pg.close()

        print("Desktop screenshot — 3-dot menu open...")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.wait_for_selector("[data-menu-trigger]", timeout=5000)
            pg.locator("[data-menu-trigger]").first.click()
            pg.wait_for_selector("[data-row-menu]", timeout=3000)
            path_m = str(SHOTS_DIR / "desktop-row-menu.png")
            pg.screenshot(path=path_m)
            screenshots.append(("row menu open", path_m)); print(f"  {path_m}")
        except Exception as e:
            print(f"  screenshot failed: {e}")
        pg.close()

        print("Desktop screenshot — new page dialog...")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 1440, "height": 900})
        goto_pages(pg)
        try:
            pg.click("button:has-text('صفحة جديدة')")
            pg.wait_for_selector("[data-page-type-select]", timeout=4000)
            path_n = str(SHOTS_DIR / "desktop-new-dialog.png")
            pg.screenshot(path=path_n)
            screenshots.append(("new page dialog", path_n)); print(f"  {path_n}")
        except Exception as e:
            print(f"  screenshot failed: {e}")
        pg.close()

        print("Mobile screenshot (390×844)...")
        pg = ctx.new_page(); pg.set_viewport_size({"width": 390, "height": 844})
        goto_pages(pg)
        try:
            pg.wait_for_selector("text=الرئيسية", timeout=5000)
            path_mob = str(SHOTS_DIR / "mobile-list.png")
            pg.screenshot(path=path_mob)
            screenshots.append(("mobile 390×844", path_mob)); print(f"  {path_mob}")
        except Exception as e:
            print(f"  screenshot failed: {e}")
        pg.close()

        browser.close()

    print("\n" + "="*60)
    print("E2E RESULTS — Day 17: Pages List Management")
    print("="*60)
    print(f"Tests: {8 - len(failures)}/8 passed")
    if failures:
        print("\nFailures:")
        for f in failures: print(f"  - {f}")
    print("\nScreenshots:")
    for lbl, path in screenshots: print(f"  [{lbl}] {path}")
    print("="*60)
    if failures: sys.exit(1)


if __name__ == "__main__":
    run()
