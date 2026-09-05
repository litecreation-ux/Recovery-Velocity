// Static hurricane event data
export const HURRICANE_EVENTS = [
  {
    id: 1,
    name: "Hurricane Gilbert",
    year: 1988,
    month: "September",
    category: 5,
    deaths: 45,
    damageMillion: 1000,
    description:
      "Category 5 direct hit on Jamaica. 45 deaths, over 100,000 homes damaged, USD 1 billion in damage. St. Thomas and Portland were cut off for weeks. National power grid failed entirely for 5+ days.",
    recoveryMonths: 18,
    parishIds: [
      "kingston",
      "st-andrew",
      "st-thomas",
      "portland",
      "st-mary",
      "st-ann",
      "trelawny",
      "st-james",
      "hanover",
      "westmoreland",
      "st-elizabeth",
      "manchester",
      "clarendon",
      "st-catherine",
    ],
  },
  {
    id: 2,
    name: "Hurricane Ivan",
    year: 2004,
    month: "September",
    category: 4,
    deaths: 17,
    damageMillion: 350,
    description:
      "Category 4, tracked south of Jamaica. 17 deaths, USD 350 million in damage. Westmoreland, Hanover, and St. James took the worst flooding. Major road damage on the north coast highway.",
    recoveryMonths: 9,
    parishIds: [
      "westmoreland",
      "hanover",
      "st-james",
      "st-elizabeth",
      "trelawny",
      "st-thomas",
      "clarendon",
    ],
  },
  {
    id: 3,
    name: "Hurricane Sandy",
    year: 2012,
    month: "October",
    category: 1,
    deaths: 1,
    damageMillion: 100,
    description:
      "Category 1 at landfall. Significant flooding in St. Thomas, Portland, and St. Mary. 1 death, USD 100 million in damage. Storm surge impacted Kingston's waterfront.",
    recoveryMonths: 3,
    parishIds: [
      "kingston",
      "st-thomas",
      "portland",
      "st-mary",
      "st-andrew",
      "st-catherine",
    ],
  },
  {
    id: 4,
    name: "Hurricane Beryl",
    year: 2024,
    month: "July",
    category: 4,
    deaths: 3,
    damageMillion: 850,
    description:
      "Category 4 at Jamaica landfall. Severe damage across southern and western parishes. Westmoreland, Hanover, and St. Elizabeth lost power for 7-14 days. Fishing communities in Hanover largely destroyed.",
    recoveryMonths: null,
    parishIds: [
      "westmoreland",
      "hanover",
      "st-elizabeth",
      "manchester",
      "st-james",
      "clarendon",
      "st-catherine",
    ],
  },
];

// Recovery forecasts for a Category 3 equivalent event
export const RECOVERY_FORECASTS: Record<
  string,
  {
    powerRestorationDays: number;
    roadAccessDays: number;
    waterRestorationDays: number;
    communicationsDays: number;
    evacuationCapacityDays: number;
    overallRecoveryDays: number;
  }
> = {
  kingston: {
    powerRestorationDays: 6.8,
    roadAccessDays: 3.2,
    waterRestorationDays: 4.5,
    communicationsDays: 2.1,
    evacuationCapacityDays: 1.8,
    overallRecoveryDays: 12.5,
  },
  "st-andrew": {
    powerRestorationDays: 8.4,
    roadAccessDays: 4.6,
    waterRestorationDays: 5.8,
    communicationsDays: 3.2,
    evacuationCapacityDays: 2.4,
    overallRecoveryDays: 15.8,
  },
  "st-thomas": {
    powerRestorationDays: 14.5,
    roadAccessDays: 11.2,
    waterRestorationDays: 9.7,
    communicationsDays: 8.3,
    evacuationCapacityDays: 7.1,
    overallRecoveryDays: 32.4,
  },
  portland: {
    powerRestorationDays: 12.3,
    roadAccessDays: 14.8,
    waterRestorationDays: 8.9,
    communicationsDays: 7.4,
    evacuationCapacityDays: 9.2,
    overallRecoveryDays: 28.6,
  },
  "st-mary": {
    powerRestorationDays: 9.1,
    roadAccessDays: 7.8,
    waterRestorationDays: 6.5,
    communicationsDays: 4.8,
    evacuationCapacityDays: 4.2,
    overallRecoveryDays: 19.3,
  },
  "st-ann": {
    powerRestorationDays: 7.2,
    roadAccessDays: 5.4,
    waterRestorationDays: 5.9,
    communicationsDays: 3.7,
    evacuationCapacityDays: 3.1,
    overallRecoveryDays: 14.8,
  },
  trelawny: {
    powerRestorationDays: 9.8,
    roadAccessDays: 8.3,
    waterRestorationDays: 7.1,
    communicationsDays: 5.9,
    evacuationCapacityDays: 5.6,
    overallRecoveryDays: 21.2,
  },
  "st-james": {
    powerRestorationDays: 7.9,
    roadAccessDays: 5.1,
    waterRestorationDays: 6.2,
    communicationsDays: 3.4,
    evacuationCapacityDays: 2.9,
    overallRecoveryDays: 15.4,
  },
  hanover: {
    powerRestorationDays: 11.6,
    roadAccessDays: 9.4,
    waterRestorationDays: 8.2,
    communicationsDays: 7.1,
    evacuationCapacityDays: 8.7,
    overallRecoveryDays: 26.8,
  },
  westmoreland: {
    powerRestorationDays: 13.9,
    roadAccessDays: 12.7,
    waterRestorationDays: 10.4,
    communicationsDays: 9.2,
    evacuationCapacityDays: 11.3,
    overallRecoveryDays: 34.7,
  },
  "st-elizabeth": {
    powerRestorationDays: 8.7,
    roadAccessDays: 6.8,
    waterRestorationDays: 6.9,
    communicationsDays: 5.1,
    evacuationCapacityDays: 4.8,
    overallRecoveryDays: 18.6,
  },
  manchester: {
    powerRestorationDays: 7.6,
    roadAccessDays: 4.9,
    waterRestorationDays: 5.7,
    communicationsDays: 3.8,
    evacuationCapacityDays: 3.3,
    overallRecoveryDays: 14.2,
  },
  clarendon: {
    powerRestorationDays: 10.4,
    roadAccessDays: 8.9,
    waterRestorationDays: 7.8,
    communicationsDays: 6.4,
    evacuationCapacityDays: 6.1,
    overallRecoveryDays: 23.9,
  },
  "st-catherine": {
    powerRestorationDays: 8.2,
    roadAccessDays: 5.7,
    waterRestorationDays: 6.1,
    communicationsDays: 4.2,
    evacuationCapacityDays: 3.6,
    overallRecoveryDays: 16.7,
  },
};

// Citizen reports by parish (static seed data)
export const SEED_CITIZEN_REPORTS: Array<{
  parishId: string;
  reporterName: string;
  content: string;
  category: string;
  status: string;
}> = [
  {
    parishId: "kingston",
    reporterName: "Marcus Thompson",
    content:
      "Spanish Town Road has major debris blocking both lanes at the intersection with Marcus Garvey Drive. Emergency vehicles cannot pass.",
    category: "infrastructure",
    status: "pending",
  },
  {
    parishId: "kingston",
    reporterName: "Natalie Clarke",
    content:
      "Kingston Public Hospital reporting shortage of Type O blood. Need urgent resupply before the weekend.",
    category: "medical",
    status: "reviewed",
  },
  {
    parishId: "kingston",
    reporterName: "Errol Brown",
    content:
      "Downtown fuel depot on Marcus Garvey Drive still has reserves. Coordinating with managers to open for emergency vehicles.",
    category: "supplies",
    status: "pending",
  },
  {
    parishId: "st-thomas",
    reporterName: "Yvonne Blake",
    content:
      "Route A4 is completely underwater at the Morant River crossing. Community completely isolated. Ferry service is the only option.",
    category: "flooding",
    status: "pending",
  },
  {
    parishId: "st-thomas",
    reporterName: "Delroy Campbell",
    content:
      "Morant Bay Community Centre has 340 displaced residents. Running low on water — current supply lasts 48 hours max.",
    category: "shelter",
    status: "pending",
  },
  {
    parishId: "st-thomas",
    reporterName: "Sister Agnes Morrison",
    content:
      "Three elderly residents at Bath Road need medical evacuation — cannot self-evacuate and road access is severed.",
    category: "medical",
    status: "reviewed",
  },
  {
    parishId: "westmoreland",
    reporterName: "Carlton Davis",
    content:
      "Savanna-la-Mar fuel depot down to 18-hour reserve. No delivery possible while A2 highway remains flooded at Cabarita Bridge.",
    category: "supplies",
    status: "pending",
  },
  {
    parishId: "westmoreland",
    reporterName: "Marlene Fairweather",
    content:
      "Fishing village at Negril completely flooded. Approximately 80 families stranded. Boats are the only access.",
    category: "flooding",
    status: "pending",
  },
  {
    parishId: "westmoreland",
    reporterName: "Pastor Everett Hall",
    content:
      "Bethel Town Primary School shelter at capacity — 520 people. Roof leaking in three classrooms. Need tarps and additional cots.",
    category: "shelter",
    status: "reviewed",
  },
  {
    parishId: "portland",
    reporterName: "Desmond Walcott",
    content:
      "Main road into the Blue Mountains community of Millbank blocked by landslide. 300+ residents cut off. Helicopter access only.",
    category: "infrastructure",
    status: "pending",
  },
  {
    parishId: "portland",
    reporterName: "Claudette Henry",
    content:
      "Port Antonio Hospital generator running on fumes — last fuel delivery was 6 days ago. Need emergency supply within 12 hours.",
    category: "medical",
    status: "pending",
  },
  {
    parishId: "hanover",
    reporterName: "Rupert McLaughlin",
    content:
      "Green Island fishing fleet completely destroyed — 23 boats lost, 47 fishermen displaced with no income. Need emergency relief.",
    category: "supplies",
    status: "pending",
  },
  {
    parishId: "st-andrew",
    reporterName: "Beverley Francis",
    content:
      "Jack's Hill transmission tower has structural damage. Emergency radio coverage is down for the entire northern St. Andrew area.",
    category: "infrastructure",
    status: "reviewed",
  },
  {
    parishId: "clarendon",
    reporterName: "Vincent Reid",
    content:
      "Rio Minho has burst banks at May Pen. Water at knee height on May Pen main street. 12 businesses and 40 homes affected.",
    category: "flooding",
    status: "pending",
  },
  {
    parishId: "st-catherine",
    reporterName: "Shelly-Ann Morris",
    content:
      "Bog Walk Gorge has fresh rockslide blocking both lanes of the A1. All traffic between Kingston and the interior is stopped.",
    category: "infrastructure",
    status: "pending",
  },
];

// Agents
export const AGENTS = [
  {
    id: 1,
    name: "ReadinessMonitor",
    description:
      "Continuously polls all 14 parishes for readiness score changes and triggers alerts when scores drop below threshold.",
    status: "active",
    lastAction: "Updated readiness score for Westmoreland: 49 → 49 (unchanged, confirming data freshness)",
    lastActionAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    parishesMonitored: ["westmoreland", "st-thomas", "hanover", "portland"],
  },
  {
    id: 2,
    name: "SupplyChainTracker",
    description:
      "Tracks fuel, water, and medical supply levels across all parish depots and flags critical shortfalls.",
    status: "active",
    lastAction: "Alert: Westmoreland fuel depot below 20% threshold — flagged for human review",
    lastActionAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    parishesMonitored: [
      "westmoreland",
      "hanover",
      "st-elizabeth",
      "manchester",
    ],
  },
  {
    id: 3,
    name: "CitizenReportProcessor",
    description:
      "Ingests, deduplicates, and categorizes incoming citizen field reports across all parishes.",
    status: "active",
    lastAction: "Processed 3 new reports from Portland, queued for human review",
    lastActionAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    parishesMonitored: [
      "kingston",
      "st-andrew",
      "st-thomas",
      "portland",
      "st-mary",
      "st-ann",
      "trelawny",
      "st-james",
      "hanover",
      "westmoreland",
      "st-elizabeth",
      "manchester",
      "clarendon",
      "st-catherine",
    ],
  },
  {
    id: 4,
    name: "WeatherCorrelator",
    description:
      "Correlates NHC storm track data with parish vulnerability profiles to generate pre-landfall readiness warnings.",
    status: "active",
    lastAction: "Tropical wave at 65°W tracking toward Jamaica — computed impact probabilities for all parishes",
    lastActionAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
    parishesMonitored: [
      "st-thomas",
      "portland",
      "st-mary",
      "kingston",
      "st-andrew",
    ],
  },
  {
    id: 5,
    name: "RouteOptimizer",
    description:
      "Computes optimal supply and evacuation routes given current road conditions and accessibility reports.",
    status: "idle",
    lastAction: "Route recalculation complete for Kingston Metro — B1 detour via Portmore adds 34 minutes",
    lastActionAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    parishesMonitored: ["kingston", "st-catherine", "st-andrew"],
  },
  {
    id: 6,
    name: "ResourceAllocator",
    description:
      "Recommends resource reallocation between parishes based on forecast severity and current inventory levels.",
    status: "active",
    lastAction: "Recommended transferring 2,000L fuel from St. Ann to Westmoreland ahead of tropical wave",
    lastActionAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    parishesMonitored: [
      "st-ann",
      "westmoreland",
      "hanover",
      "trelawny",
      "st-james",
    ],
  },
  {
    id: 7,
    name: "AuditLogger",
    description:
      "Records all agent actions, human review decisions, and data mutations with full parish context for accountability.",
    status: "active",
    lastAction: "Logged 14 events in last cycle across 8 parishes",
    lastActionAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    parishesMonitored: [
      "kingston",
      "st-andrew",
      "st-thomas",
      "portland",
      "st-mary",
      "st-ann",
      "trelawny",
      "st-james",
      "hanover",
      "westmoreland",
      "st-elizabeth",
      "manchester",
      "clarendon",
      "st-catherine",
    ],
  },
];

// Seed review items
export const SEED_REVIEW_ITEMS: Array<{
  parishId: string;
  parishName: string;
  type: string;
  title: string;
  description: string;
  status: string;
}> = [
  {
    parishId: "st-thomas",
    parishName: "St. Thomas",
    type: "evacuation_plan",
    title: "Emergency ferry deployment — Morant Bay",
    description:
      "Request to deploy 2 coast guard vessels as emergency ferry link between Morant Bay and Kingston. Route A4 remains impassable for 72+ hours. Est. 1,200 residents require transport.",
    status: "pending",
  },
  {
    parishId: "westmoreland",
    parishName: "Westmoreland",
    type: "resource_request",
    title: "Emergency fuel drop — Savanna-la-Mar depot",
    description:
      "Fuel depot at 18-hour reserve. Request emergency airlift of 10,000L diesel for emergency vehicles. Road delivery impossible while A2 flooded.",
    status: "pending",
  },
  {
    parishId: "kingston",
    parishName: "Kingston",
    type: "infrastructure_alert",
    title: "Route B1 debris clearance priority",
    description:
      "Spanish Town Road blocked by storm debris at Marcus Garvey Drive junction. Clearance unlocks access to Kingston Public Hospital, main fuel depot, and 3 utility staging areas. Estimated 4-hour clearance.",
    status: "pending",
  },
  {
    parishId: "portland",
    parishName: "Portland",
    type: "resource_request",
    title: "Helicopter fuel resupply — Port Antonio Hospital",
    description:
      "Port Antonio Hospital generator running at 12-hour fuel reserve. Last road delivery 6 days ago. Request helicopter delivery of 500L diesel. All road access blocked by landslides.",
    status: "pending",
  },
  {
    parishId: "hanover",
    parishName: "Hanover",
    type: "citizen_report",
    title: "Green Island fishing community — total loss",
    description:
      "23 fishing vessels destroyed in Beryl. 47 fishermen displaced with no income or shelter. Community center overflow. Request emergency relief package and temporary shelter deployment.",
    status: "approved",
  },
  {
    parishId: "clarendon",
    parishName: "Clarendon",
    type: "infrastructure_alert",
    title: "Rio Minho flood containment — May Pen",
    description:
      "River has burst banks in May Pen town centre. 40 homes and 12 businesses affected. Flood barriers not deployed. Request National Works Agency response team.",
    status: "pending",
  },
  {
    parishId: "st-catherine",
    parishName: "St. Catherine",
    type: "infrastructure_alert",
    title: "Bog Walk Gorge rockslide — A1 blocked",
    description:
      "Fresh rockslide blocking A1 at Bog Walk Gorge. Primary inland corridor from Kingston Metro completely closed. Est. 6-8 hours to clear. Divert heavy vehicles via Flat Bridge.",
    status: "rejected",
  },
  {
    parishId: "st-andrew",
    parishName: "St. Andrew",
    type: "infrastructure_alert",
    title: "Jack's Hill comms tower structural damage",
    description:
      "Emergency radio tower at Jack's Hill has visible structural damage from wind loading. Northern St. Andrew emergency radio coverage offline. Engineer assessment required before any restoration work.",
    status: "pending",
  },
];
