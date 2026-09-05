export interface ParishObservationDataset {
  id: string;
  name: string;
  authority: string;
  sourceUrl: string;
  sourceTable: string;
  observationDate: string;
  permissionNote: string;
  refreshCadenceDays: number;
  refreshExpectation: string;
}

export interface ParishObservationRecord {
  parishId: string;
  sourceRecordId: string;
  usuallyResidentPopulation: number;
  communicationPopulation: number;
  communicationSomeDifficulty: number;
  communicationMuchDifficulty: number;
  communicationCannotDo: number;
}

export const PARISH_OBSERVATION_DATASETS: ParishObservationDataset[] = [
  {
    id: "statin-census-2011-usual-resident-population",
    name: "Population Usually Resident in Jamaica, by Parish: 2011",
    authority: "Statistical Institute of Jamaica (STATIN)",
    sourceUrl: "https://statinja.gov.jm/Census/PopCensus/PopulationUsuallyResidentinJamaicabyParish.aspx",
    sourceTable: "Population Usually Resident in Jamaica, by Parish: 2011 — Total Population",
    observationDate: "2011-04-04",
    permissionNote: "Published as an official public statistical table. RVP displays cited values and does not claim a broader redistribution licence.",
    refreshCadenceDays: 90,
    refreshExpectation: "Verify the official table and content hash every 90 days; replace values only when STATIN publishes a superseding parish table.",
  },
  {
    id: "statin-census-2011-communication-difficulty",
    name: "Population 5 Years Old and Over by Level of Difficulty related to Communicating, by Parish",
    authority: "Statistical Institute of Jamaica (STATIN)",
    sourceUrl: "https://statinja.gov.jm/Census/PopCensus/Population%205%20Years%20Old%20and%20Over%20by%20Level%20of%20Difficulty%20related%20to%20Communicating%20by%20Parish.aspx",
    sourceTable: "Level of Difficulty — Some Difficulty + Much Difficulty + Cannot Do It At All",
    observationDate: "2011-04-04",
    permissionNote: "Published as an official public statistical table. RVP displays a cited calculation and does not claim a broader redistribution licence.",
    refreshCadenceDays: 90,
    refreshExpectation: "Verify the official table and content hash every 90 days; replace values only when STATIN publishes a superseding parish table.",
  },
];

export const PARISH_OBSERVATION_RECORDS: Record<string, ParishObservationRecord> = {
  "kingston": {
    "parishId": "kingston",
    "sourceRecordId": "STATIN-PHC2011-KINGSTON",
    "usuallyResidentPopulation": 89057,
    "communicationPopulation": 76791,
    "communicationSomeDifficulty": 731,
    "communicationMuchDifficulty": 160,
    "communicationCannotDo": 65
  },
  "st-andrew": {
    "parishId": "st-andrew",
    "sourceRecordId": "STATIN-PHC2011-ST-ANDREW",
    "usuallyResidentPopulation": 573369,
    "communicationPopulation": 534609,
    "communicationSomeDifficulty": 5444,
    "communicationMuchDifficulty": 1306,
    "communicationCannotDo": 602
  },
  "st-thomas": {
    "parishId": "st-thomas",
    "sourceRecordId": "STATIN-PHC2011-ST-THOMAS",
    "usuallyResidentPopulation": 93902,
    "communicationPopulation": 86321,
    "communicationSomeDifficulty": 1041,
    "communicationMuchDifficulty": 267,
    "communicationCannotDo": 108
  },
  "portland": {
    "parishId": "portland",
    "sourceRecordId": "STATIN-PHC2011-PORTLAND",
    "usuallyResidentPopulation": 81744,
    "communicationPopulation": 75709,
    "communicationSomeDifficulty": 1005,
    "communicationMuchDifficulty": 290,
    "communicationCannotDo": 118
  },
  "st-mary": {
    "parishId": "st-mary",
    "sourceRecordId": "STATIN-PHC2011-ST-MARY",
    "usuallyResidentPopulation": 113615,
    "communicationPopulation": 103770,
    "communicationSomeDifficulty": 1444,
    "communicationMuchDifficulty": 370,
    "communicationCannotDo": 139
  },
  "st-ann": {
    "parishId": "st-ann",
    "sourceRecordId": "STATIN-PHC2011-ST-ANN",
    "usuallyResidentPopulation": 172362,
    "communicationPopulation": 157746,
    "communicationSomeDifficulty": 1805,
    "communicationMuchDifficulty": 512,
    "communicationCannotDo": 256
  },
  "trelawny": {
    "parishId": "trelawny",
    "sourceRecordId": "STATIN-PHC2011-TRELAWNY",
    "usuallyResidentPopulation": 75164,
    "communicationPopulation": 68675,
    "communicationSomeDifficulty": 812,
    "communicationMuchDifficulty": 227,
    "communicationCannotDo": 74
  },
  "st-james": {
    "parishId": "st-james",
    "sourceRecordId": "STATIN-PHC2011-ST-JAMES",
    "usuallyResidentPopulation": 183811,
    "communicationPopulation": 167359,
    "communicationSomeDifficulty": 1554,
    "communicationMuchDifficulty": 350,
    "communicationCannotDo": 192
  },
  "hanover": {
    "parishId": "hanover",
    "sourceRecordId": "STATIN-PHC2011-HANOVER",
    "usuallyResidentPopulation": 69533,
    "communicationPopulation": 63126,
    "communicationSomeDifficulty": 791,
    "communicationMuchDifficulty": 201,
    "communicationCannotDo": 89
  },
  "westmoreland": {
    "parishId": "westmoreland",
    "sourceRecordId": "STATIN-PHC2011-WESTMORELAND",
    "usuallyResidentPopulation": 144103,
    "communicationPopulation": 130656,
    "communicationSomeDifficulty": 1598,
    "communicationMuchDifficulty": 439,
    "communicationCannotDo": 229
  },
  "st-elizabeth": {
    "parishId": "st-elizabeth",
    "sourceRecordId": "STATIN-PHC2011-ST-ELIZABETH",
    "usuallyResidentPopulation": 150205,
    "communicationPopulation": 138167,
    "communicationSomeDifficulty": 1986,
    "communicationMuchDifficulty": 636,
    "communicationCannotDo": 310
  },
  "manchester": {
    "parishId": "manchester",
    "sourceRecordId": "STATIN-PHC2011-MANCHESTER",
    "usuallyResidentPopulation": 189797,
    "communicationPopulation": 174661,
    "communicationSomeDifficulty": 2168,
    "communicationMuchDifficulty": 534,
    "communicationCannotDo": 290
  },
  "clarendon": {
    "parishId": "clarendon",
    "sourceRecordId": "STATIN-PHC2011-CLARENDON",
    "usuallyResidentPopulation": 245103,
    "communicationPopulation": 224131,
    "communicationSomeDifficulty": 2750,
    "communicationMuchDifficulty": 749,
    "communicationCannotDo": 329
  },
  "st-catherine": {
    "parishId": "st-catherine",
    "sourceRecordId": "STATIN-PHC2011-ST-CATHERINE",
    "usuallyResidentPopulation": 516218,
    "communicationPopulation": 472949,
    "communicationSomeDifficulty": 4737,
    "communicationMuchDifficulty": 1194,
    "communicationCannotDo": 537
  }
};
