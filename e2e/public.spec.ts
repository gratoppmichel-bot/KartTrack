import { expect, test } from "@playwright/test";

test("protected pages redirect to the login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
});

test("privacy policy is public", async ({ page }) => {
  await page.goto("/datenschutz");
  await expect(page.getByRole("heading", { name: "Datenschutzerklärung" })).toBeVisible();
});

test("web app manifest is installable", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: "KartTrack", display: "standalone", start_url: "/" });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
});
