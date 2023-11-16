---
layout: archive
title: "Publications"
permalink: /publications/
author_profile: true
---


You can find my previous articles on my DERASAT [profile page](https://www.derasat.org.bh/research-analysis/experts/abdulaziz-aldosseri/).

## M.S. Thesis (Work in Progress)
This thesis aims to solve the problem of natural gas storage valuation. [Here](https:///abdulaziz-aldoseri.github.io/files/MS_thesis/Proposal.pdf) you can find the thesis proposal.

Below, I will list high-level components of the modeling approach/choices:
* _Algorithmic Implementation_: To benchmark the results obtained and avoid performance variability due to individual implementation. To avoid this short coming, I have used [stable-baselines3]( https://jmlr.org/papers/volume22/20-1364/20-1364.pdf) as my algorithmic library.
* _Customized Environment_: I have customized a standardized template environment from the [Gymnasium](https://gymnasium.farama.org/index.html) library (formerly known as OpenAI Gym).
* _Hyper-Parameter Optimization_: Hyper-parameter optimization is based on the [Optuna](https://optuna.org/) framework. This significantly helps the automation and improvement of the search over the hyper-parameters spaces.
* _Financial Data_: I used the spot and front month futures data from [EIA]( https://www.eia.gov/dnav/ng/NG_PRI_FUT_S1_M.htm).

(Last update Nov/1/2023) I will share the source code for the thesis very soon!

## Sample Essay
### The Minsky Moment from a System Dynamics Perspective
[This](https:///abdulaziz-aldoseri.github.io/files/SD/Minsky.pdf) is a concise literature review of Minsky's financial instability hypothesis from a system dynamics perspective.


## Sample of Previous Projects
**Disclaimer**: _All code is provided as is. There is no warranty that it runs on your platform, or that it will be appropriate to solve your problem. Unfortunately, I will not be able to reply to questions on how to run the code on a particular platform. I would be happy to receive reports on ways to improve the code and potential mistakes. If you end up using the code, please send me an email to let me know what the particular problem you worked on was._

### Solving the Traveling Salesman with Profit (TSPP) Problem using Ant Colony System (ACS)
This [project](https:///abdulaziz-aldoseri.github.io/files/TSPP_ACS/Project.pdf) was part of a graduate-level course on [Heuristic Optimization](https:///abdulaziz-aldoseri.github.io/files/TSPP_ACS/IE_517_syllabus.PDF). The aim was to implement an algorithm to solve multiple instances of the TSPP problem.

Click [here](https:///abdulaziz-aldoseri.github.io/files/TSPP_ACS/TSPP.rar) to download the code (C++), TSPP instances and a short report.

### Ecological Simulation and Analysis Using System Dynamics
This project was part of a graduate-level course on [System Dynamics](https:///abdulaziz-aldoseri.github.io/files/SD/IE_550_syllabus.PDF). The aim was to simulate and analyze the dynamics of an endangered fish species given different government protective policies.

Click [here](https:///abdulaziz-aldoseri.github.io/files/SD/Project.rar) to download the simulation code (VENSIM) and report.

### Evolution of Trust Using Agent-Based Modeling
This project was part of a graduate-level course on [Agent-Based Modeling](https:///abdulaziz-aldoseri.github.io/files/ABM/Syllabus.pdf). The aim was to simulate and analyze the evolution of trust in an agent-based model given different behavioral, game-theoritic, settings.

Click [here](https:///abdulaziz-aldoseri.github.io/files/ABM/GroupD.rar) to download the simulation code (NetLogo) and report.




