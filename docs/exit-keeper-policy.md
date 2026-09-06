---
name: Exit keeper policy
description: Durable safety rules for Liqora automated exits.
---

Automated exits require the position tick to remain outside the same side of its range for five continuous minutes. Returning in range or crossing to the other side resets the timer. NFT approval is per token ID and revocable; the NFT remains in the owner's wallet, and collected assets always go directly to the owner.

**Why:** Automation must not become custodial or execute from a brief price excursion, and users need explicit downside protection through side-specific minimum output amounts.

**How to apply:** Preserve these constraints in contract, worker, and UI changes. Never describe automation as active unless the deployed contract, dedicated gas-funded operator, and worker status are all verified.