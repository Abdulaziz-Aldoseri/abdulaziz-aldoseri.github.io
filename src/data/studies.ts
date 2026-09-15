// Presentation metadata. Frozen model inputs/results remain in their native files.
export type StudyEvidenceState =
  | { stage: 'planned'; evidenceVersion: null; runtime: 'planned'; independentlyReviewed: false }
  | { stage: 'evaluated'; evidenceVersion: string; runtime: 'precomputed-grid' | 'browser-exact' | 'browser-simulation'; independentlyReviewed: boolean };
export interface StudyDisplay {
  id: string; templateVersion: string; order: number; sector: string; year: number;
  title: string; introduction: string; context: string; route: string;
  evidence: StudyEvidenceState;
  sections: { id: string; label: string }[];
}
export const studies = {
  "energy": {
    "id": "energy",
    "templateVersion": "2.1.0",
    "order": 1,
    "sector": "Energy & infrastructure",
    "year": 2026,
    "title": "Can electricity storage reduce daily peaks?",
    "introduction": "Storage draws electricity when charging and supplies it when discharging. The decision is when to do each so that the day’s highest requirement is lower—even though actual demand is unknown when the schedule is set.",
    "context": "This study adds a hypothetical store to Great Britain’s electricity system. It uses NESO National Demand: a metered-generation requirement excluding station load, pumping and exports. The model schedules storage against a simple forecast, then tests that schedule against actual observations.",
    "route": "/projects/energy-flexibility/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-14-astro-energy-preview",
      "runtime": "precomputed-grid",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "model-brief-heading",
        "label": "Understand the model ↓"
      },
      {
        "id": "explorer",
        "label": "Try the scenarios"
      },
      {
        "id": "findings",
        "label": "Results & implications"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  },
  "mobility": {
    "id": "mobility",
    "templateVersion": "2.1.0",
    "order": 2,
    "sector": "Transport & mobility",
    "year": 2026,
    "title": "Where should rebalancing effort go?",
    "introduction": "A bike in the wrong place cannot serve the next departure. With a limited number of moves before the morning rush, which stations should receive bikes—and which should supply them?",
    "context": "Explore that planning question through London’s recorded cycle-hire flows. Earlier mornings supply the forecast; later mornings test the allocation. This study measures how transfers could offset uneven flows, while keeping the missing stock and dock information explicit.",
    "route": "/projects/mobility-rebalancing/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-14-mobility-rebalancing",
      "runtime": "browser-exact",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "mobility-model",
        "label": "Understand the decision ↓"
      },
      {
        "id": "mobility-explorer",
        "label": "Explore the allocation"
      },
      {
        "id": "mobility-period",
        "label": "Every test morning"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  },
  "retail": {
    "id": "retail",
    "templateVersion": "2.1.0",
    "order": 3,
    "sector": "Retail & commerce",
    "year": 2026,
    "title": "Which products get the next unit?",
    "introduction": "With a limited allowance of product units, how should a retailer divide them before seeing the week’s activity? Explore how the allocation changes when avoiding shortfalls matters more than avoiding leftovers.",
    "context": "This historical experiment uses 2009–2011 invoice records from an unnamed UK giftware retailer. Earlier weeks supply activity scenarios for 30 fixed products. The model chooses whole-unit allocations, then compares them with recorded activity in a later week.",
    "route": "/projects/retail-allocation/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-14-retail-allocation",
      "runtime": "browser-exact",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "retail-model",
        "label": "Understand the decision ↓"
      },
      {
        "id": "retail-explorer",
        "label": "Try an allocation"
      },
      {
        "id": "retail-period",
        "label": "Across all test weeks"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  },
  "airline": {
    "id": "airline",
    "templateVersion": "2.1.0",
    "order": 4,
    "sector": "Airline industry",
    "year": 2026,
    "title": "Which aircraft mix covers the service plan?",
    "introduction": "An airline can cover a route with different combinations of aircraft size and flight frequency. How many aircraft of each type would a defined service pattern require?",
    "context": "Explore eight Denver regional routes using SkyWest’s recorded 2025 service in the US Bureau of Transportation Statistics data. This retrospective planning model sizes a hypothetical pooled fleet; it does not reconstruct the airline’s actual fleet or timetable.",
    "route": "/projects/airline-fleet/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-14-fleet-staff",
      "runtime": "precomputed-grid",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "airline-model",
        "label": "Understand the decision ↓"
      },
      {
        "id": "airline-explorer",
        "label": "Explore the allocation"
      },
      {
        "id": "airline-scenarios",
        "label": "Compare all scenarios"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  },
  "telecom": {
    "id": "telecom",
    "templateVersion": "2.1.0",
    "order": 5,
    "sector": "Telecom & services",
    "year": 2026,
    "title": "How should staff be shared across telecom casework?",
    "introduction": "A fixed team faces uneven workloads across billing, technical and privacy cases. Where should cross-trained staff go when capacity is limited—and what happens to the work left behind?",
    "context": "This independent study uses open FCC complaint intake to test a hypothetical casework team. The records come from the US regulator, not an operator contact centre. Staff capacity and backlog are explicit modelling assumptions; the recorded intake supplies the workload variation.",
    "route": "/projects/telecom-staff/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-14-fleet-staff",
      "runtime": "precomputed-grid",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "telecom-model",
        "label": "Understand the decision ↓"
      },
      {
        "id": "telecom-explorer",
        "label": "Explore the allocation"
      },
      {
        "id": "telecom-period",
        "label": "Follow all twelve weeks"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  },
  "healthcare": {
    "id": "healthcare",
    "templateVersion": "2.1.1",
    "order": 6,
    "sector": "Healthcare",
    "year": 2026,
    "title": "When should surgical patients be admitted?",
    "introduction": "Booking surgery also commits a recovery bed for several days. When should each patient arrive, and which ward should hold that complete stay, when bed space and theatre time are both limited?",
    "context": "Explore admissions, surgery and recovery together using open generated benchmarks based on one Belgian hospital. Compare earlier admissions with less extra theatre time, while keeping every patient and the source’s fixed admission windows.",
    "route": "/projects/healthcare-scheduling/",
    "evidence": {
      "stage": "evaluated",
      "evidenceVersion": "2026-09-15-healthcare-scheduling-v1.0.0",
      "runtime": "precomputed-grid",
      "independentlyReviewed": true
    },
    "sections": [
      {
        "id": "healthcare-model",
        "label": "Understand the decision ↓"
      },
      {
        "id": "healthcare-explorer",
        "label": "Explore the schedule"
      },
      {
        "id": "healthcare-cases",
        "label": "Compare every case"
      },
      {
        "id": "sources",
        "label": "Data & notebook"
      }
    ]
  }
} satisfies Record<string, StudyDisplay>;
