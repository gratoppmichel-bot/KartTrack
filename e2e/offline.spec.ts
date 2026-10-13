import { expect, test, type Page } from "@playwright/test";

const MOCK = "http://localhost:54321";

const pendingCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("karttrack", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("pending", { keyPath: "id" });
        open.onsuccess = () => {
          const count = open.result.transaction("pending").objectStore("pending").count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );

test("sessions entered offline are queued and uploaded once the network is back", async ({ page, context, request }) => {
  await request.get(`${MOCK}/__reset`);

  // sign in and let the service worker cache the pages it keeps for offline use
  await page.goto("/login");
  await page.fill('input[type="email"]', "e2e@test.local");
  await page.fill('input[type="password"]', "Test1234!");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.goto("/sessions/new");
  await expect(page.getByRole("heading", { name: "Neue Session" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Meine Sessions")).toBeVisible();

  // go offline: the form still loads from the cache
  await context.setOffline(true);
  await page.goto("/sessions/new");
  await expect(page.getByRole("heading", { name: "Neue Session" })).toBeVisible();

  // 1) existing track
  await page.selectOption("select", { label: "E2E Testbahn (Test)" });
  await page.locator("textarea").first().fill("1:02.345\n1:01.870\n1:01.512\n1:01.100\n1:01.000");
  await page.getByRole("button", { name: "Session speichern" }).click();
  await expect(page.getByText("Offline gespeichert")).toBeVisible();
  expect(await pendingCount(page)).toBe(1);

  // 2) brand-new custom track, created offline
  await page.getByRole("button", { name: "Weitere Session eintragen" }).click();
  await page.selectOption("select", "new");
  await page.fill('input[placeholder="Name der Strecke"]', "Offline Ring");
  await page.locator("textarea").first().fill("55.500\n55.100");
  await page.getByRole("button", { name: "Session speichern" }).click();
  await expect(page.getByText("Offline gespeichert")).toBeVisible();
  expect(await pendingCount(page)).toBe(2);

  // the offline-created track stays selectable and the banner counts the queue
  await page.getByRole("button", { name: "Weitere Session eintragen" }).click();
  await expect(page.locator("select option", { hasText: "Offline Ring" })).toHaveCount(1);
  await expect(page.getByText("2 Sessions warten auf Sync")).toBeVisible();

  // back online: the queue drains by itself
  await context.setOffline(false);
  await expect.poll(() => pendingCount(page), { timeout: 20_000 }).toBe(0);
  await expect(page.getByText("2 Sessions synchronisiert")).toBeVisible();

  // everything arrived, parents before children, then achievements were evaluated
  const writes: { method?: string; table?: string; rows?: number; rpc?: string }[] = await (await request.get(`${MOCK}/__log`)).json();
  expect(writes.map((w) => w.rpc ?? w.table)).toEqual([
    "sessions", "laps", "tracks", "sessions", "laps", "award_achievements",
  ]);
  expect(writes.filter((w) => w.table === "laps").map((w) => w.rows)).toEqual([5, 2]);
});
