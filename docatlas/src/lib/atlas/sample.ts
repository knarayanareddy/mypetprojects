// Built-in sample documents: two dated versions of the same program report plus a data file.
// They deliberately disagree on a few numbers so cross-file conflict detection has something to show.

export const SAMPLE_GOAL = "Decide whether to approve the extra funding the warehouse automation program is asking for.";

export const SAMPLE_FILES: { name: string; content: string }[] = [
  {
    name: "automation-business-case-2025-03.md",
    content: `# Warehouse Automation Program — Business Case

Prepared March 14, 2025 by the Northwind Logistics Operations Office.

## Executive overview

Northwind Logistics plans to automate order picking at its three regional warehouses. The program replaces manual cart picking with goods-to-person robotic stations. Management expects the program to cut order cycle time and reduce overtime costs. The total program budget is $4.2 million. The program is scheduled to go live on August 18, 2025. Leadership considers on-time delivery critical because peak season begins in October.

## Goals and targets

The program has three goals. First, raise picking productivity so that each station reaches 320 picks per hour. Second, reduce order cycle time by 35% compared with the 2024 baseline. Third, lower overtime spending by 40% within twelve months of go-live. These targets are ambitious but achievable if the robots arrive on schedule. Stable software leads to higher pick rates, so the team will freeze the warehouse management system configuration in June. Higher pick rates reduce order cycle time, and shorter cycle times lower overtime spending.

Each station is expected to reach 320 picks per hour. The baseline today is 140 picks per hour with manual carts.

## Budget

The robotic stations are the largest cost item and account for half of the budget. The table below shows the planned spend and duration of each phase.

| Phase | Budget ($M) | Duration (weeks) |
| --- | --- | --- |
| Robotic stations | 2.1 | 14 |
| Software integration | 0.9 | 10 |
| Facility retrofit | 0.7 | 8 |
| Training and change management | 0.3 | 6 |
| Contingency | 0.2 | 2 |

The contingency reserve is small, so any price increase from the vendor would need new funding.

## Risks

Supplier lead time for the robotic stations is the main risk. The vendor quotes 12 weeks for delivery. A delay of more than 4 weeks would push go-live into the peak season freeze. Software integration with the legacy warehouse management system may expose data quality problems. Staff may resist the new picking process, so the team plans 6 weeks of training before go-live.

## Timeline

The program runs in four stages over about 5 months. Site surveys and vendor contracting finish in April. Robot delivery and facility retrofit run from May to July. Software integration and testing overlap with delivery and finish in early August. The final two weeks are reserved for pilot operation and staff sign-off before go-live. The Dayton warehouse goes first because it has the highest order volume, and Reno and Tampa follow in a second wave after peak season. The schedule has very little slack, so every phase depends on the previous one finishing on time.

## Stakeholders and governance

The Operations Office owns the budget and reports monthly to the executive committee. The warehouse managers at each site own the change management plan and the training schedule. The finance team reviews every purchase order above $50,000 and tracks actual spend against the plan. An independent consultant reviews the vendor contract before signature. The steering group meets every second Tuesday and escalates any item that threatens the go-live date. Customer service leaders are consulted because faster order cycle time should reduce the number of late-delivery complaints.

## Expected benefits

The business case assumes that overtime spending falls from $1.8 million to about $1.1 million per year. Order cycle time is expected to drop from 9.5 hours to 6.2 hours. Management estimates a payback period of roughly 3 years, which is preliminary and depends on the final contract price.

> "Automation is the only way we handle peak season without hiring another 80 temporary pickers." — Maria Chen, Program Director
`,
  },
  {
    name: "automation-status-update-2025-09.md",
    content: `# Warehouse Automation Program — Status Update

Prepared September 22, 2025 by the Northwind Logistics Operations Office.

## Executive overview

Northwind Logistics continues to automate order picking at its three regional warehouses. The total program budget is now $4.8 million. The program is now scheduled to go live on November 10, 2025. The delay is driven by late delivery of the robotic stations. Leadership considers the revised date risky because peak season begins in October and the freeze starts in early November.

## Progress to date

The first robotic stations were installed at the Dayton warehouse in August. Late delivery of the robotic stations delays the go-live date, but the pilot itself ran well. Each station is now expected to reach 290 picks per hour. Pilot results are shown below.

| Week | Picks per hour | Error rate (%) |
| --- | --- | --- |
| Week 1 | 210 | 3.1 |
| Week 2 | 228 | 2.6 |
| Week 3 | 244 | 1.9 |
| Week 4 | 263 | 1.4 |
| Week 5 | 276 | 1.1 |
| Week 6 | 285 | 0.8 |

Error rate fell from 3.1% to 0.8% over the six weeks of the pilot. Pilot stations reached 285 picks per hour in week 6. Staff training was completed ahead of plan, and the team reports high acceptance of the new picking process.

> "The pilot proves the concept; the schedule is the only thing at risk." — Maria Chen, Program Director

## Timeline update

Robot delivery, originally planned for May to July, now runs from June to October. Facility retrofit at Dayton finished on schedule in July, while Reno and Tampa retrofit work has been paused until the delivery dates are confirmed. Software integration testing is running in parallel with the pilot and should finish in late October. The extra weeks for pilot operation were removed to protect the go-live date, which means the team has no schedule slack left. The Reno and Tampa wave will start after peak season, as originally planned.

## Stakeholder feedback

Warehouse managers report that the pilot stations are easier to operate than expected and that pickers prefer the new workflow. Finance has asked for a monthly forecast of vendor payments because the price change affects the cash plan. The steering group asked the vendor to confirm the delivery dates in writing. Customer service leaders report that late-delivery complaints at Dayton are down since the pilot started, although the sample is small. The independent consultant has recommended a second review of the contract amendment before any further payment is made.

## Budget

Because the vendor raised its prices, the robotic stations cost $0.3 million more than planned. The revised budget is shown below.

| Phase | Budget ($M) | Duration (weeks) |
| --- | --- | --- |
| Robotic stations | 2.4 | 18 |
| Software integration | 1.1 | 10 |
| Facility retrofit | 0.8 | 8 |
| Training and change management | 0.3 | 6 |
| Contingency | 0.2 | 2 |

The contingency reserve of $0.2 million is unchanged and is considered insufficient for another price change.

## Risks and issues

Supplier delay is now the critical issue. The vendor now quotes 18 weeks for delivery. A further slip would push go-live past the peak season freeze and could cost an estimated $0.5 million in lost savings. The team estimates overtime savings of about 25% in the first year, but this figure is preliminary. Software integration took longer than planned, so the extra $0.2 million for integration is a known overrun.

## Decision requested

Management is asked to approve additional funding of $0.6 million to finish the program. We recommend approving the request, because the pilot confirms the productivity gains and a cancelled program would waste the robotic stations already installed. If funding is not approved by the end of September, the vendor will release the delivery slot to another customer.
`,
  },
  {
    name: "site-throughput-2025.csv",
    content: `Month,Dayton (orders/day),Reno (orders/day),Tampa (orders/day)
Apr 2025,4120,3380,2910
May 2025,4210,3420,2985
Jun 2025,4350,3510,3040
Jul 2025,4290,3600,3120
Aug 2025,4480,3655,3190
Sep 2025,4720,3710,3260
`,
  },
];
