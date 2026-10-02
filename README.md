# 🧙‍♂️ Arcane Survival 3D: Isometric Action RPG

> **College Final Project — 3D Isometric Auto-Battler**  
> **Engine:** Three.js (Playable Web 3D) & Unity 3D (C#)  
> **Perspective:** Isometric RPG (Diablo / Hades / Torchlight style)  

---

## 🌐 Live Online Host (Temporary Host)

The 3D game is actively hosted live on the internet! Open and play on any device (desktop, laptop, tablet, or phone) without installation:

👉 **Live URL:** **https://arcane-survival-3d.loca.lt**  
*(If prompted by loca.lt for a Tunnel Password, enter your public IP: `180.191.77.253`)*

👉 **Local URL:** **`http://localhost:3000`**

To re-launch anytime with one click:
- Double-click [`start_online_host.bat`](file:///c:/projects/start_online_host.bat)
- Or run `npm run dev` in `c:\projects`.

---

## 🛡️ Enclosed Terrain & Safe Center Spawn

- **Enclosed Battlefield:** The entire match takes place inside the sacred temple courtyard of `el_inicio_-_the_beggining.glb`, surrounded by stone obelisks, ancient ruins, and pine forests.
- **Safe Center Spawn:** The Lizard Wizard spawns at $(0, y_{ground}, 0)$ in the dead center of the temple courtyard, standing firmly and safely on the stone floor.
- **Strict Collision Boundaries:**
  - The playable map is strictly bounded by a radius of $R = 34.0\text{m}$.
  - The boundary is framed by 24 ancient stone ward pillars and a glowing translucent arcane ward wall.
  - Rigid boundary clamping ensures the player cannot leave, fall off, or walk outside the map, with realistic tangential wall-sliding physics.
- **Enemy Infiltration:** Monsters spawn exclusively on the inner rim of the enclosed courtyard ($R \approx 30.5\text{m}$) and charge inward toward the player.

---

## 📐 Dynamic Floor Detection & Z-Index Layering

- **Dynamic Ground Raycasting:** Downward raycasting samples the exact height $Y$ of the 3D terrain flagstones beneath the player, enemies, and items in real time. Characters smoothly ascend stone stairs and navigate slopes with boots planted on the floor.
- **Corrected Depth & Z-Index Layering:**
  - Terrain materials configured with `polygonOffset` (`factor = 1.0, units = 1.0`), `depthTest = true`, and `depthWrite = true`.
  - Characters (Hero and Enemies) assigned `renderOrder = 2`, guaranteeing they always render cleanly on top of the terrain without clipping or appearing submerged beneath the floor.
  - Ground decals, runic circles, and casting rings assigned `renderOrder = 1` with `depthWrite = false` to blend smoothly onto the stone floor without occluding character models.

---

## ⚡ Interactive Terrain Systems

1. **The Altar of Arcane Wrath (`Z = -20`):** Step onto the glowing cyan runic circle and press **`[SPACE]`**, **`[E]`**, or tap the on-screen **`⚡ SHRINE`** button to detonate a $140\text{ damage}$ radial shockwave, heal $+40\text{ HP}$, and gain $+45\%$ attack speed for $8\text{ seconds}$ ($18\text{s}$ cooldown).
2. **5 Ancient Fire Torches:** Walk near or shoot fireballs near unlit torches to ignite them, dealing $12\text{ damage/tick}$ to passing enemies ($+150\text{ XP}$ bonus for lighting all 5).
3. **6 Destructible Mana Crystals:** Shatter glowing ice crystals with fireballs to drop $+30\text{ XP}$ Arcane Gems and $+15\text{ HP}$ heals.

---

## 🎮 Controls Summary

| Control | Action |
| :--- | :--- |
| `W`, `A`, `S`, `D` / `Arrow Keys` | Screen-relative isometric movement (with acceleration, banking lean, and stride bob) |
| `Space` / `E` / `⚡ Tap Shrine` | Activate Altar of Arcane Wrath when inside the shrine circle |
| `Touch Drag` | Dynamic 360° virtual joystick on mobile devices |
| `R` | Quick restart upon game over |
