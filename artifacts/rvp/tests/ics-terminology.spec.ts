import { expect, test, type Page } from "@playwright/test";

const API_FIXTURES: Record<string, unknown> = {
  "/api/dashboard/summary": {
    totalParishes: 14,
    criticalCount: 2,
    atRiskCount: 4,
    moderateCount: 8,
    avgReadinessScore: 62,
    pendingReviewCount: 0,
    activeAgents: 6,
    recentEvents: [],
  },
  "/api/risk/countries": [
    {
      code: "JAM",
      name: "Jamaica",
      region: "Caribbean",
      hasOperationalUnits: true,
      hazards: ["hurricane"],
      preparednessScope: "National and parish operational coverage",
    },
  ],
  "/api/risk/countries/JAM/overview": {
    country: {
      code: "JAM",
      name: "Jamaica",
      region: "Caribbean",
      hasOperationalUnits: true,
      hazards: ["hurricane"],
      preparednessScope: "National and parish operational coverage",
    },
    phase: {
      phase: "preparedness",
      source: "test fixture",
      reason: "Terminology regression fixture",
      decidedAt: "2026-01-01T00:00:00.000Z",
      isOverride: false,
    },
    worldBankIndicators: [],
    activeTropicalCyclones: {
      sourceName: "test fixture",
      sourceUrl: "https://example.com",
      sourceStatus: "available",
      lastSuccessfulRefresh: "2026-01-01T00:00:00.000Z",
      coverageNote: "Fixture coverage",
      storms: [],
    },
    currentThreatAdvisories: [],
    historicalExposure: {
      sourceName: "test fixture",
      sourceUrl: "https://example.com",
      sourceStatus: "available",
      lastSuccessfulRefresh: "2026-01-01T00:00:00.000Z",
      methodology: "Fixture methodology",
      events: [],
    },
    resilience: {
      modelVersion: "fixture",
      score: 62,
      label: "Moderate",
      factors: [
        { name: "Fixture factor", value: 62, weight: "1.0", direction: "stable" },
      ],
      uncertainty: "Fixture uncertainty",
      limitations: "Fixture limitations",
      calculation: "Fixture calculation",
    },
    administrativeFocusAreas: [],
    regionalReference: {
      name: "CDEMA",
      url: "https://example.com",
      note: "Fixture reference",
    },
  },
  "/api/parishes": [
    {
      id: "st-elizabeth",
      name: "St. Elizabeth",
      readinessScore: 62,
      readinessLevel: "At risk",
      bottleneck: "Fixture bottleneck",
    },
  ],
  "/api/parishes/st-elizabeth": {
    id: "st-elizabeth",
    name: "St. Elizabeth",
    readinessScore: 62,
    readinessLevel: "At risk",
    bottleneck: "Fixture bottleneck",
    population: 150000,
    area: 1212,
    capitalCity: "Black River",
  },
  "/api/parishes/st-elizabeth/citizen-reports": [],
  "/api/parishes/st-elizabeth/resources": {
    parishId: "st-elizabeth",
    fuelPercent: 80,
    waterPercent: 75,
    medicalPercent: 70,
    lastUpdated: "2026-01-01T00:00:00.000Z",
  },
  "/api/review-items": [],
  "/api/tasks": [],
  "/api/resource-declarations": [],
};

const ROLE_LABELS = {
  national_coordinator: "Incident Commander",
  parish_manager: "Ops Section Chief",
  field_officer: "Field Unit Leader",
  system_admin: "System Admin",
  private_sector_partner: "Unified Command Partner",
} as const;

const ICS_SIDEBAR_LABELS = [
  "ICS Workflow",
  "Command Overview",
  "Preparedness Planning",
  "Incident Action Plan",
  "Ops Section",
  "Logistics Section",
  "Incident Command",
];

const CDEMA_REFERENCE =
  "Scoring methodology aligned with CDEMA Caribbean Disaster Management Framework and ICS National Incident Management standards.";
const TRIAGE_NOTICE =
  "Active triage queue — ICS Operations Section. Priority scores are AI-generated indicators based on incident type and approval status. All actions require Incident Command authorization before execution.";

async function mockReadOnlyApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.abort();
      return;
    }

    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(API_FIXTURES[path] ?? []),
    });
  });
}

async function selectRole(page: Page, label: string) {
  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await expect(page.getByText(label, { exact: true }).filter({ visible: true }).first()).toBeVisible();
}

async function expectVisibleLabels(page: Page, labels: string[]) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  }
}

async function expectWorkflowPage(page: Page, path: string, title: string) {
  await page.goto(path);
  await expect(page.locator("header").getByText("ICS Workflow", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}

test.describe("ICS sidebar terminology", () => {
  test("keeps every role label and relevant sidebar label", async ({ page }) => {
    await mockReadOnlyApi(page);
    await page.goto("/ops/scores");

    await expectVisibleLabels(page, [ROLE_LABELS.national_coordinator, ...ICS_SIDEBAR_LABELS]);

    await page.goto("/ops/scores");
    await selectRole(page, ROLE_LABELS.parish_manager);
    await expectVisibleLabels(page, [ROLE_LABELS.parish_manager, ...ICS_SIDEBAR_LABELS]);

    await page.goto("/ops/scores");
    await selectRole(page, ROLE_LABELS.field_officer);
    await expectVisibleLabels(page, [ROLE_LABELS.field_officer, "Field Reports"]);

    await page.goto("/ops/scores");
    await selectRole(page, ROLE_LABELS.system_admin);
    await expectVisibleLabels(page, [ROLE_LABELS.system_admin, "Agent Monitor"]);

    await page.goto("/ops/scores");
    await selectRole(page, ROLE_LABELS.private_sector_partner);
    await expectVisibleLabels(page, [
      ROLE_LABELS.private_sector_partner,
      "Infrastructure and Resources",
    ]);
  });
});

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`protects ICS workflow route language at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockReadOnlyApi(page);
    await page.goto("/");

    await expectWorkflowPage(page, "/ops/scores", "Preparedness SITREP");
    await expectVisibleLabels(page, [
      "Preparedness SITREP",
      "Incident Action Plan",
      "Ops Section",
      "Logistics Section",
      CDEMA_REFERENCE,
    ]);

    await expectWorkflowPage(page, "/ops/recommendations", "Incident Action Plan — Recommended Actions");
    await expectVisibleLabels(page, [
      "PRE-INCIDENT PLANNING",
      "RESPONSE PHASE",
      "RECOVERY PHASE",
    ]);

    await expectWorkflowPage(page, "/ops/incidents", "Ops Section — Active Incident Triage");
    await expect(page.getByText(TRIAGE_NOTICE, { exact: true })).toBeVisible();

    await expectWorkflowPage(page, "/ops/tasks", "Logistics Section");
    await expectVisibleLabels(page, ["Preparedness SITREP", "Incident Action Plan", "Ops Section", "Logistics Section"]);
  });
}

test("role-specific ICS pages retain their operational labels on mobile", async ({ page }) => {
  await mockReadOnlyApi(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ops/scores");

  await selectRole(page, ROLE_LABELS.parish_manager);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText(ROLE_LABELS.parish_manager, { exact: true }).first()).toHaveText(ROLE_LABELS.parish_manager);
  await expect(page.getByRole("heading", { name: "Preparedness SITREP", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await selectRole(page, ROLE_LABELS.field_officer);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Field Unit Leader", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await selectRole(page, ROLE_LABELS.private_sector_partner);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Unified Command — Private Sector Resources", { exact: true })).toBeVisible();
});

test("keeps approval before dispatch and switches context with the active incident", async ({ page }) => {
  const reviewItems = [
    {
      id: 1,
      parishId: "st-thomas",
      parishName: "St. Thomas",
      type: "resource_request",
      title: "St. Thomas fuel request",
      description: "Approve fuel movement for St. Thomas.",
      status: "pending",
      createdAt: "2026-01-01T00:00:00.000Z",
      reviewedAt: null,
      reviewedBy: null,
    },
    {
      id: 2,
      parishId: "portland",
      parishName: "Portland",
      type: "infrastructure_alert",
      title: "Portland road clearance",
      description: "Approve road clearance for Portland.",
      status: "pending",
      createdAt: "2026-01-01T00:01:00.000Z",
      reviewedAt: null,
      reviewedBy: null,
    },
  ];

  const parishes = [
    { id: "st-thomas", name: "St. Thomas", readinessScore: 44, readinessLevel: "Critical", bottleneck: "St. Thomas ferry link", population: 95018, area: 743 },
    { id: "portland", name: "Portland", readinessScore: 58, readinessLevel: "At risk", bottleneck: "Portland road access", population: 82000, area: 814 },
  ];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let response: unknown = API_FIXTURES[path] ?? [];

    if (path.startsWith("/api/review-items")) {
      if (request.method() === "PATCH") {
        const id = Number(path.split("/").at(-1));
        const body = request.postDataJSON() as { status: "approved" | "rejected"; reviewedBy?: string };
        const item = reviewItems.find((candidate) => candidate.id === id)!;
        Object.assign(item, {
          status: body.status,
          reviewedBy: body.reviewedBy ?? null,
          reviewedAt: "2026-01-01T00:02:00.000Z",
        });
        response = item;
      } else {
        response = reviewItems;
      }
    } else if (path === "/api/resources/operational") {
      response = [];
    } else {
      const parish = parishes.find((candidate) => path === `/api/parishes/${candidate.id}`);
      if (parish) response = parish;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("rvp-demo-role", "national_coordinator");
  });
  await page.goto("/review");

  await expect(page.getByTestId("section-context-parish")).toContainText("St. Thomas");
  await expect(page.getByTestId("button-approve-1")).toBeVisible();
  await expect(page.getByTestId("button-reject-1")).toBeVisible();
  await expect(page.getByTestId("form-dispatch-1")).toHaveCount(0);

  await page.getByTestId("button-approve-1").click();
  await expect(page.getByTestId("form-dispatch-1")).toBeVisible();
  await expect(page.getByTestId("button-approve-1")).toHaveCount(0);
  await expect(page.getByTestId("button-reject-1")).toHaveCount(0);

  await page.getByTestId("button-cancel-dispatch-1").click();
  await expect(page.getByTestId("button-approve-2")).toBeVisible();
  await expect(page.getByTestId("section-context-parish")).toContainText("Portland");
  await expect(page.getByTestId("value-context-readiness")).toHaveText("58");
});