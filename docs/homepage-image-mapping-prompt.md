# Claude Code Prompt — Homepage: Port Mockup + Map Product Images

## Task
Convert `yogurmac-homepage-mockup-v2.html` into a Next.js App Router page at `app/page.tsx`
for the shop project. Replace every `.img-ph` placeholder div with a `<Image />` component
using the images already in the `product images/` folder.

---

## Step 1 — Prepare the image folder

1. List all files inside `product images/`.
2. If the folder is not already inside `public/`, move it there now.
3. Rename it `product-images` (hyphen, no space) so Next.js serves it without encoding issues.
4. All image `src` paths will be `/product-images/filename.ext`.

---

## Step 2 — Map images to slots

There are **8 image slots** in the mockup. Read each filename in `product-images/` and assign
it to the best matching slot using the keyword signals in the table below.

| Slot | Location | Match on filename keywords |
|---|---|---|
| `hero-product` | Hero — right col, top card | yogurt · granola · bar · product · food · styled · flat |
| `hero-ythirst` | Hero — right col, bottom card | children · outreach · community · school · kids · support |
| `product-yogurt` | Product grid — card 1 | yogurt · natural · greek · classic · plain |
| `product-granola` | Product grid — card 2 | granola · oat · honey · cereal · crunch |
| `product-bar` | Product grid — card 3 | bar · energy · snack · bite |
| `editorial-lifestyle` | Editorial strip — col 2 (tall card) | lifestyle · family · breakfast · table · brand · Lagos · scene |
| `editorial-ythirst` | Editorial strip — col 3 top | children · outreach · community · school · kids · support |
| `editorial-kitchen` | Editorial strip — col 3 bottom | kitchen · making · hands · process · craft · production |

**Rules:**
- If a filename could match multiple slots, assign it to the most specific one first,
  then use the next best file for the secondary slot.
- If the folder has fewer distinct images than slots, reuse the closest match —
  e.g. the best outreach photo can fill both `hero-ythirst` and `editorial-ythirst`.
- The editorial strip col 1 (dot tile) needs no image — it is a CSS background div, leave it as-is.
- Log your mapping decisions as inline comments above each `<Image />` so the decisions are
  visible and easy to swap later.

---

## Step 3 — Build `app/page.tsx`

### Image implementation
```tsx
import Image from 'next/image'

// Every image slot:
<div className="hcard-img"> {/* or pcard-img / edit-card-tall / edit-card-sm */}
  <Image
    src="/product-images/filename.ext"
    alt="Descriptive alt text"
    fill
    style={{ objectFit: 'cover' }}
    priority // add only on the two hero images; omit on everything below the fold
  />
  {/* caption strip stays here, after the Image */}
  <div className="hcard-strip-dark"> … </div>
</div>
```

The parent container already has `position: relative` and explicit height from the mockup CSS —
do not add inline positioning to the parent.

### Fonts
Add `Barlow Condensed` and `Barlow` via `next/font/google` in `app/layout.tsx` —
do **not** use a `<link>` tag. Apply the font CSS variables to `:root` so the existing
class names in the stylesheet pick them up without changes.

### CSS
Copy the full `<style>` block from the mockup into `app/globals.css` verbatim.
Keep every class name identical.

### HTML → JSX conversion
- `class` → `className`
- `for` → `htmlFor`  
- Inline style strings → style objects: `style="color:red"` → `style={{ color: 'red' }}`
- Self-close void elements: `<input />`, `<br />`
- Escape `&` as `&amp;` (already done in the mockup)

### Section order (port in this sequence)
1. `<nav>` — navigation bar
2. Hero — dots bg, text left, image cards right
3. Product grid — 3-col, 240px images
4. Editorial image strip — dot tile · lifestyle card · two stacked cards
5. Ythirst section — dark green, stats, placeholder copy
6. Partner CTA — gold section, tier cards
7. Show More row
8. Footer

### Constraints
- All product names, prices, stats, and copy stay hardcoded from the mockup —
  no data fetching in this pass.
- Do not extract sub-components unless a section exceeds ~80 lines of JSX.
- Do not change any colours, spacing, layout, or class names.
- Do not add Tailwind — the project uses the plain CSS from the mockup.
