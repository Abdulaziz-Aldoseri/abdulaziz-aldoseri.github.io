---
layout: ../../../layouts/Page.astro
title: "Energy asset valuation"
category: "Case studies"
description: "Valuing operating flexibility in a natural-gas storage asset with deep reinforcement learning: the decision, the method and the limits of the result."
---

Advanced analytics applied to an energy investment decision, built during the MSc in Industrial Engineering (Operations Research).

<h2 id="energy-asset-valuation">The model</h2>

*MSc project, Boğaziçi University, 2024*

**The decision:** what a natural-gas storage asset is worth to an investor or capacity lessee, given the flexibility to buy, store and sell as prices move, within capacity limits and operating costs.

**The approach:** deep reinforcement learning (SAC, compared with PPO and TD3) trained on daily spot and futures prices to learn an operating policy, whose value informs the investment and leasing decision.

**What the result supports:** the policy learned during training but did not hold up on 2023 data outside its training period. The practical lesson is that a learned operating policy needs out-of-period validation before it is used to price an asset; markets that shift regime can invalidate it.

**Methods:** reinforcement learning, sequential decisions under price uncertainty, Python.

[Full write-up (PDF)](/files/MS_thesis/Abdulaziz_Aldoseri_Thesis.pdf)
