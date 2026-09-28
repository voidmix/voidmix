# Product

## Users

Developers, AI engineers, product/design teams, and technical operators who need local files, models, GPU resources, and toolchains to work together with cloud-visible tasks and remote control.

## Product Purpose

VoidMix is a cross-platform AI workbench. Desktop runs Pi-powered Agents beside an authorized local project; Web monitors projects and tasks, adjusts future steps, manages teams, and sends remote or scheduled commands. Cloud data keeps project, task, Agent, event, and artifact state consistent across devices.

## Brand Personality

Calm, precise, technical, and collaborative. VoidMix should feel like an Agent Signal Room: multiple capable roles working in one legible system, with enough energy to show live execution without turning the product into a toy.

## Product Principles

1. **Local power, cloud visibility.** File access, models, GPU, and toolchains stay on Desktop; progress, control, and collaboration travel through Web.
2. **Show the work.** Agent roles, messages, tool calls, files, steps, and decisions are visible as an understandable conversation, not a black box.
3. **Truthful state.** Running, queued, waiting, failed, cancelled, offline, and unavailable states are explicit. Preview data is never presented as live.
4. **One workspace, two densities.** Desktop is a dense dark multi-panel workstation; Web is a lighter monitoring and management surface.
5. **Safe authority.** Project paths and tool capabilities are explicitly authorized. Remote commands identify target device and impact before they run. Credentials and private content never enter logs.

## Visual Direction

- Use shadcn base-nova Neutral in light and dark modes across all shipped surfaces.
- Preserve the original Logo, favicon and native application icons and their colors.
- Primary actions are black on light surfaces and light on dark surfaces. Ordinary
  statuses use neutral badges plus text/icons; errors use the destructive role.
- Refine typography, alignment, lists, form feedback and real product imagery.
- Support keyboard focus, WCAG 2.2 AA contrast, responsive Web layouts and reduced motion.
- The exact shipped patterns are recorded in [DESIGN.md](DESIGN.md).

## Anti-references

- Decorative neon, glassmorphism, or generic AI gradients without product meaning.
- Fake realtime logs, fake progress, or claims of live sync when unavailable.
- Dense panels without hierarchy, unexplained technical jargon, or color-only status communication.

## Scope Boundaries

Pi owns Agent execution, sessions, tools, model runtime, and event streaming. VoidMix owns project/workflow orchestration, authorization, persistence, cross-device synchronization, Web/Desktop composition, remote commands, scheduling, team permissions, and artifact sharing. IM integrations, billing providers, and model credentials remain explicit configuration seams.
