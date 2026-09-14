---
layout: ../../../layouts/Page.astro
title: Where should rebalancing effort go?
description: Scope of a planned open-data allocation study using London cycle-hire journey records.
category: 02 / Transport & mobility
---

<div class="planned-scope"><p><strong>Planned independent study.</strong> The data and decision scope have been assessed. The model, evaluation and interactive page are still to be developed.</p></div>

## The decision

Given a limited number of bicycle moves and station visits, where should rebalancing effort be allocated? The planned study compares an integer allocation model with simple rules, using observed journey flows across London's cycle-hire stations.

The aim is to expose the trade-off between the number of moves, the number of stations touched and the remaining imbalance. Resource limits will be explicit scenarios, rather than claims about TfL's actual operating budgets.

## The evidence

Transport for London's open cycle-hire journey records provide station endpoints, timestamps and bicycle types. The assessed source window covers January–March 2026. The intended evaluation uses a fixed historical split and measures residual observed net-flow imbalance.

Journey records describe completed activity. They do not establish unserved demand, historical dock availability or station inventory. This study therefore concerns an abstract allocation problem; it will not claim actual reductions in stockouts or reproduce a dispatch operation.

## Planned methods and outputs

- Integer optimization with limits on total moves and stations touched.
- A comparison with transparent allocation rules using the same information.
- An interactive resource-allocation page, an evaluation across held-out days and a reproducible Python notebook.
- Explicit accounting for preparation decisions and the limits of the observed journey data.

## Open source and attribution

[TfL open-data documentation](https://tfl.gov.uk/info-for/open-data-users/our-open-data) · [Original cycling data](https://cycling.data.tfl.gov.uk/) · [Transport Data Service terms](https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service).

Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016. Geomni UK Map data © and database rights [2019]. Independent study planning by Abdulaziz Aldoseri; no TfL endorsement is implied.

[Explore the completed energy study](/projects/energy-flexibility/) · [Return to the directory](/projects/)
