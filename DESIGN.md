# Voidmix Design System

## Overview

Voidmix is a friendly personal file workspace for web and desktop. White surfaces, graphite text, blue actions and green completion states support everyday file management.

## Visual Language

- Register: Product UI
- Color strategy: restrained, with blue reserved for primary actions and current state
- Shape: 6px controls, 8px framed tools and dialogs, with unframed auth content
- Typography: system sans stack, medium-weight labels, strong compact headings
- Motion: 160-220ms ease-out state transitions; reduced-motion removes nonessential animation

## Color Tokens

| Role             | Light                   | Use                            |
| ---------------- | ----------------------- | ------------------------------ |
| Background       | `oklch(1 0 0)`          | App canvas                     |
| Surface          | `oklch(1 0 0)`          | Header and elevated panels     |
| Foreground       | `oklch(0.23 0.005 260)` | Primary text                   |
| Muted foreground | `oklch(0.38 0.008 260)` | Supporting text                |
| Primary          | `oklch(0.42 0.16 260)`  | Primary actions and focus      |
| Success          | `oklch(0.34 0.065 165)` | Completed actions              |
| Destructive      | `oklch(0.42 0.16 28)`   | Destructive actions and errors |

Text must meet WCAG AAA against its intended surface. Supporting text is never placed directly on saturated fills.

## Layout

- App canvas: max 1168px with 24px desktop and 20px mobile gutters
- Auth: unframed 416px content column with a 48px brand mark
- Workspace: title, compact upload toolbar and full-width file table
- Mobile: one-column flow, actions wrap and retain 44px targets
- Typography: 16px body and controls, 14px minimum supporting text, 28-32px headings

## Components

- Buttons: primary for a single task action, outline for supporting actions, destructive only for irreversible actions
- Inputs: persistent labels, 48px control height, focused ring and contextual helper copy
- File rows: filename, metadata and status appear as a compact summary, actions stay visually secondary
- Notices: icon plus explicit text for success, information and error
- Dialogs: only for irreversible deletion, with cancel focused first
