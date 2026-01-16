# Table of Contents Scroll Tracking: Architecture & Learnings

*A comprehensive breakdown of building an active section indicator for a documentation sidebar*

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Requirements](#feature-requirements)
3. [Architecture Diagram](#architecture-diagram)
4. [ADEPT Explanation](#adept-explanation)
5. [Implementation Evolution](#implementation-evolution)
6. [Final Implementation](#final-implementation)
7. [Key Learnings](#key-learnings)
8. [Common Pitfalls](#common-pitfalls)
9. [Performance Considerations](#performance-considerations)
10. [Future Improvements](#future-improvements)

---

## Overview

**The Problem:** When reading a long document with a sidebar table of contents (TOC), users need visual feedback showing which section they're currently reading.

**The Solution:** Dynamically highlight the active section in the TOC as the user scrolls through the document.

**Visual Indicator:**
- Active h2 sections: Coral background with white text + white arrow (→)
- Active h3 subsections: Teal background with white text
- Auto-scroll TOC to keep active item visible

---

## Feature Requirements

### Core Functionality
1. ✅ Track user's scroll position in real-time
2. ✅ Determine which section is currently "active"
3. ✅ Highlight the active section in the sidebar TOC
4. ✅ Auto-expand parent sections when subsection is active
5. ✅ Auto-scroll TOC to keep active item visible

### User Experience Goals
- **Accurate:** Always reflects what the user is reading
- **Smooth:** No flickering or jumping
- **Fast:** Minimal performance impact
- **Persistent:** Maintains state correctly during scroll

### Technical Constraints
- Must work with dynamic content (varying section lengths)
- Must handle both h2 and h3 headings
- Must account for sidebar layout (320px fixed width)
- Must be mobile-responsive
- On narrow screens (<= 1024px), the TOC auto-hides and uses an external backdrop overlay

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │   SIDEBAR    │  │      MAIN CONTENT                │   │
│  │   (TOC)      │  │                                  │   │
│  │              │  │  ┌─────────────────────┐         │   │
│  │ ○ Section 1  │  │  │ <h2> Section 1      │ ← 150px│   │
│  │ ● Section 2  │  │  └─────────────────────┘         │   │
│  │   ○ Sub 2.1  │  │                                  │   │
│  │   ○ Sub 2.2  │  │  Content for section 1...        │   │
│  │ ○ Section 3  │  │                                  │   │
│  │              │  │  ┌─────────────────────┐ ← 200px │   │
│  │              │  │  │ <h2> Section 2      │  ACTIVE │   │
│  │              │  │  └─────────────────────┘  ZONE   │   │
│  └──────────────┘  │                                  │   │
│                     │  Content for section 2...        │   │
│                     │                                  │   │
│                     │  ┌─────────────────────┐         │   │
│                     │  │ <h3> Subsection 2.1 │         │   │
│                     │  └─────────────────────┘         │   │
│                     └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

ACTIVE ZONE = Top 200px of viewport
When a heading enters this zone, it becomes the active section
```

### Component Flow

```
┌──────────────┐
│ Scroll Event │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ updateActiveSection │
│   (throttled via    │
│  requestAnimation   │
│      Frame)         │
└──────┬──────────────┘
       │
       ▼
┌───────────────────────────────────┐
│ Loop through all h2[id], h3[id]  │
│ headings (backward from bottom)   │
└──────┬────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Find last heading with             │
│ getBoundingClientRect().top ≤ 200 │
└──────┬─────────────────────────────┘
       │
       ▼
┌───────────────────┐      ┌──────────────────┐
│ Has active ID     │─No──▶│ Use first heading│
│ changed?          │      └──────────────────┘
└──────┬────────────┘
       │ Yes
       ▼
┌────────────────────────────────────┐
│ Update TOC:                        │
│ 1. Remove all .active classes      │
│ 2. Add .active to current section  │
│ 3. Expand parent if h3             │
│ 4. Scroll TOC to show active item  │
└────────────────────────────────────┘
```

---

## ADEPT Explanation

### A - Analogy

**Think of reading a book with a GPS tracker:**

Imagine you're reading a physical book and someone is watching which page you're on. They have a map of the book (table of contents) and they highlight the chapter you're currently reading.

- **The book pages** = Your document sections
- **Your eyes** = The scroll position (top 200px of viewport)
- **The map highlighter** = The active class on TOC items
- **The person tracking** = The `updateActiveSection()` function

As you turn pages (scroll), they continuously check: "Which chapter are their eyes on right now?" and update the highlighted chapter on the map.

### D - Diagram

**How position detection works:**

```
VIEWPORT (what you see)
┌─────────────────────────────┐
│ ← 0px (top edge)            │
│                             │
│ ← 200px (THRESHOLD)         │ ← If heading is HERE or ABOVE,
│ ═══════════════════════════ │   it's considered ACTIVE
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
└─────────────────────────────┘

Example scenario:
┌─────────────────────────────┐
│ <h2 id="intro"> (top: -500) │ ← Above viewport (scrolled past)
│ <h2 id="features"> (150px)  │ ← ACTIVE (within threshold!)
│ <h3 id="feature-1"> (400px) │ ← Below threshold (not active yet)
│ <h2 id="conclusion"> (900px)│ ← Far below (not active)
└─────────────────────────────┘

Result: "features" section is highlighted in TOC
```

### E - Example

**Real scroll scenario:**

```javascript
// Document structure:
<h2 id="intro">Introduction</h2>
<p>Lots of content...</p>
<h2 id="setup">Setup</h2>
<p>More content...</p>
<h3 id="installation">Installation</h3>
<p>Even more content...</p>

// User scrolls to middle of "Setup" section:

getBoundingClientRect() results:
- intro: { top: -800 }     ← scrolled past (above viewport)
- setup: { top: 150 }      ← ACTIVE (at 150px from top)
- installation: { top: 600 } ← not reached yet (below)

Algorithm (backward loop):
1. Check "installation" → top: 600 > 200 ❌
2. Check "setup" → top: 150 ≤ 200 ✅ MATCH!
3. Break loop, "setup" is active

Update TOC:
- Remove .active from "intro" (if it had it)
- Add .active to "setup"
- Coral background appears on "Setup" in sidebar
```

### P - Plain English

**How it works in simple terms:**

Every time you scroll, the browser runs a function that:

1. **Looks at all the headings** in your document (the h2 and h3 titles)
2. **Checks where each heading is** relative to the top of your screen
3. **Finds the heading that's closest to the top** (within 200 pixels)
4. **Highlights that heading** in the sidebar with a coral background
5. **Scrolls the sidebar** if needed so you can see which section is highlighted

It's like having a reading assistant who always points to the current chapter as you read.

### T - Technical

**Core algorithm (final implementation):**

```javascript
function updateActiveSection() {
  // 1. Get all headings with IDs (these appear in TOC)
  const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));
  if (headings.length === 0) return;

  let newActiveId = null;

  // 2. Loop backward (bottom to top of document)
  //    This ensures we get the deepest heading passed
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i];
    const rect = heading.getBoundingClientRect();

    // 3. Check if heading is at or above the 200px threshold
    if (rect.top <= 200) {
      newActiveId = heading.id;
      break; // Found it, stop searching
    }
  }

  // 4. Fallback: if nothing found, use first heading
  if (!newActiveId) {
    newActiveId = headings[0].id;
  }

  // 5. Only update DOM if active section changed (prevents flicker)
  if (newActiveId !== currentActiveId) {
    currentActiveId = newActiveId;

    // Update highlighting...
  }
}
```

**Why backward loop?**
- If you loop forward, you might pick a heading that's way above the viewport
- Looping backward finds the **last** heading you've passed = most accurate

**Why 200px threshold?**
- Gives comfortable reading space before section "activates"
- Not too aggressive (100px) or too lazy (300px+)
- Accounts for typical reading eye position

---

## Implementation Evolution

### Attempt 1: `offsetTop` with Forward Loop ❌

**Code:**
```javascript
const scrollPos = window.scrollY;
for (let i = 0; i < headings.length; i++) {
  if (heading.offsetTop <= scrollPos + 200) {
    currentId = heading.id;
  }
}
```

**Why it failed:**
- `offsetTop` is relative to the offset parent, not the viewport
- With sidebar layout, offset parent can be `<body>`, `.main-content`, etc.
- Position calculations were inconsistent
- **Symptom:** Worked for first 3 sections, then glitched

### Attempt 2: `getBoundingClientRect()` with Distance Calculation ❌

**Code:**
```javascript
let closestDistance = Infinity;
sections.forEach(section => {
  const rect = section.getBoundingClientRect();
  const distanceFromTop = rect.top;

  if (distanceFromTop <= 150 && Math.abs(distanceFromTop) < closestDistance) {
    closestDistance = Math.abs(distanceFromTop);
    activeId = section.id;
  }
});
```

**Why it failed:**
- Trying to find "closest" heading created ambiguity
- Multiple headings could be "close" to the threshold
- **Symptom:** Flickering between sections

### Attempt 3: Intersection Observer with Complex RootMargin ❌

**Code:**
```javascript
const observerOptions = {
  rootMargin: '-100px 0px -66%',
  threshold: 0
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      visibleHeadings.add(entry.target.id);
    } else {
      visibleHeadings.delete(entry.target.id);
    }
  });
}, observerOptions);
```

**Why it failed:**
- `rootMargin` was too aggressive (cutting off 66% of viewport)
- Created gaps where NO headings were visible
- Intersection logic was overly complex
- **Symptom:** Blanking out (no active section) in certain scroll positions

### Attempt 4: Intersection Observer with Manual Rect Checks ❌

**Code:**
```javascript
if (entry.isIntersecting) {
  visibleHeadings.add(id);
} else {
  const rect = entry.target.getBoundingClientRect();
  if (rect.top < 150) {
    visibleHeadings.add(id); // Keep if above threshold
  } else {
    visibleHeadings.delete(id);
  }
}
```

**Why it failed:**
- Mixing Intersection Observer callbacks with manual position checks = complexity
- Hard to reason about when headings are added/removed from Set
- **Symptom:** Still had blanking issues

### Attempt 5: Simple Backward Loop with `getBoundingClientRect()` ✅

**Code:**
```javascript
for (let i = headings.length - 1; i >= 0; i--) {
  const heading = headings[i];
  const rect = heading.getBoundingClientRect();

  if (rect.top <= 200) {
    newActiveId = heading.id;
    break;
  }
}
```

**Why it works:**
- **Viewport-relative positions** (`getBoundingClientRect()`) are accurate regardless of layout
- **Backward loop** guarantees we find the last/deepest heading crossed
- **Simple threshold check** (≤ 200px) is easy to understand and debug
- **Change detection** prevents unnecessary DOM updates

---

## Final Implementation

### Complete Code

```javascript
// Track current active section
let currentActiveId = null;

// Highlight current section based on scroll
function updateActiveSection() {
  const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));
  if (headings.length === 0) return;

  let newActiveId = null;

  // Find the heading that's currently at the top of the reading area
  // (within 200px of the top of the viewport)
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i];
    const rect = heading.getBoundingClientRect();

    // If this heading is at or above 200px from top, it's active
    if (rect.top <= 200) {
      newActiveId = heading.id;
      break;
    }
  }

  // Fallback to first heading if none found
  if (!newActiveId) {
    newActiveId = headings[0].id;
  }

  // Only update if changed
  if (newActiveId !== currentActiveId) {
    currentActiveId = newActiveId;

    // Remove all active classes
    tocNav.querySelectorAll('a').forEach(link =>
      link.classList.remove('active')
    );

    // Add active class to current section
    const activeLink = tocNav.querySelector(`a[data-id="${currentActiveId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');

      // If it's an h3, expand its parent h2 section
      const parentSection = activeLink.closest('.toc-h2');
      if (activeLink.closest('.toc-h3') && parentSection) {
        parentSection.classList.add('expanded');
      }

      // Scroll the TOC to keep active item visible
      activeLink.scrollIntoView({ block: 'nearest' });
    }
  }
}

// Attach to scroll events with requestAnimationFrame throttling
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (scrollTimeout) {
    window.cancelAnimationFrame(scrollTimeout);
  }
  scrollTimeout = window.requestAnimationFrame(() => {
    updateActiveSection();
    updateProgress();
    updateBackToTop();
  });
});

// Initial update
updateActiveSection();
```

### CSS for Active States

```css
/* Main section (h2) active state */
.toc-h2 > a.active {
  background: var(--accent-coral);  /* Coral background */
  color: #fff;                       /* White text */
  border-left-color: var(--accent-coral);
  font-weight: 600;
  position: relative;
}

/* Arrow indicator on active h2 */
.toc-h2 > a.active::after {
  content: '';
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid #fff;     /* White arrow → */
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

/* Subsection (h3) active state */
.toc-h3 a.active {
  background: var(--accent-teal);   /* Teal background */
  color: #fff;                       /* White text */
  border-left-color: var(--accent-teal);
  font-weight: 600;
}
```

---

## Key Learnings

### 1. Position Detection Methods

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| **`offsetTop`** | Simple property access | Relative to offset parent, breaks with complex layouts | Static layouts only |
| **`getBoundingClientRect()`** | Always viewport-relative, accurate | Slightly more expensive (triggers reflow) | Dynamic layouts, scroll tracking |
| **Intersection Observer** | Efficient, built for visibility tracking | Overkill for simple scroll tracking, complex API | Lazy loading, animation triggers |

**Verdict:** For scroll-based active section tracking, `getBoundingClientRect()` is the sweet spot.

### 2. Loop Direction Matters

**Forward loop (top → bottom):**
```javascript
for (let i = 0; i < headings.length; i++) { ... }
```
- Finds the **first** heading meeting criteria
- Can pick headings far above viewport
- Less accurate

**Backward loop (bottom → top):**
```javascript
for (let i = headings.length - 1; i >= 0; i--) { ... }
```
- Finds the **last** heading meeting criteria
- Represents deepest scroll position
- More accurate for "current section"

### 3. Threshold Tuning

Different thresholds create different UX:

```
THRESHOLD: 50px
├─ Section changes very quickly
├─ User might feel "rushed"
└─ Good for: Short sections, dense content

THRESHOLD: 200px (CHOSEN)
├─ Comfortable activation point
├─ Matches natural reading position
└─ Good for: Long-form documentation

THRESHOLD: 400px
├─ Section changes slowly
├─ Might feel "laggy"
└─ Good for: Very long sections
```

### 4. Change Detection Prevents Flicker

**Without change detection:**
```javascript
// Runs on EVERY scroll event (60fps = 60 times/second)
tocNav.querySelectorAll('a').forEach(...);  // Expensive!
```

**With change detection:**
```javascript
if (newActiveId !== currentActiveId) {
  // Only runs when section actually changes (a few times per document)
  tocNav.querySelectorAll('a').forEach(...);
}
```

**Performance impact:**
- Without: ~60 DOM updates/second during scroll
- With: ~5-10 DOM updates per full document scroll

### 5. RequestAnimationFrame is Essential

**Without RAF:**
```javascript
window.addEventListener('scroll', () => {
  updateActiveSection();  // Runs on every scroll event
});
```
- Can run hundreds of times during a single scroll gesture
- Blocks rendering
- Janky scrolling

**With RAF:**
```javascript
window.addEventListener('scroll', () => {
  if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
  scrollTimeout = requestAnimationFrame(() => {
    updateActiveSection();  // Runs once per frame (60fps max)
  });
});
```
- Throttled to monitor refresh rate (typically 60fps)
- Smooth scrolling maintained

---

## Common Pitfalls

### Pitfall 1: Forgetting Fallback Logic

```javascript
// BAD: No fallback
if (rect.top <= 200) {
  newActiveId = heading.id;
}
// If user is at very top, newActiveId might be null!

// GOOD: Always have a fallback
if (!newActiveId) {
  newActiveId = headings[0].id;
}
```

### Pitfall 2: Not Checking for Empty Arrays

```javascript
// BAD: Will crash if no headings exist
const headings = document.querySelectorAll('h2[id], h3[id]');
for (let i = headings.length - 1; i >= 0; i--) { ... }

// GOOD: Guard clause
const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));
if (headings.length === 0) return;
```

### Pitfall 3: Using IDs That Don't Exist in TOC

```javascript
// If heading has ID "my-section" but TOC has data-id="my-section-2"
// querySelector will return null

// Solution: Ensure heading IDs match TOC data-id attributes exactly
const activeLink = tocNav.querySelector(`a[data-id="${currentActiveId}"]`);
if (activeLink) {  // Always check before manipulating
  activeLink.classList.add('active');
}
```

### Pitfall 4: Not Clearing Previous Active States

```javascript
// BAD: Adds .active but never removes old ones
activeLink.classList.add('active');

// GOOD: Clear all first, then add
tocNav.querySelectorAll('a').forEach(link =>
  link.classList.remove('active')
);
activeLink.classList.add('active');
```

---

## Performance Considerations

### Current Performance Profile

**Per scroll event:**
1. `querySelectorAll('h2[id], h3[id]')` - O(n) where n = total headings (~20-50)
2. Loop through headings - O(n) worst case (usually breaks early)
3. `getBoundingClientRect()` per heading - Triggers reflow (expensive!)
4. DOM updates (if active changed) - O(m) where m = TOC items

**Total:** O(n) per frame, where n = number of headings

**For a document with 30 headings:**
- Best case: ~5-10 iterations (early break)
- Worst case: ~30 iterations (at top of document)
- Average: ~15 iterations

### Optimization Opportunities

#### 1. Cache Heading Elements

**Current:**
```javascript
function updateActiveSection() {
  const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));
  // ... (queried on every scroll frame)
}
```

**Optimized:**
```javascript
// Cache once at page load
const cachedHeadings = Array.from(document.querySelectorAll('h2[id], h3[id]'));

function updateActiveSection() {
  // Use cached array (no DOM query!)
  for (let i = cachedHeadings.length - 1; i >= 0; i--) {
    // ...
  }
}
```

**Savings:** Eliminates `querySelectorAll` call on every frame

#### 2. Use Debouncing Instead of RAF

**Current (RAF):**
```javascript
// Runs once per frame (60fps)
requestAnimationFrame(() => updateActiveSection());
```

**Alternative (Debounce):**
```javascript
// Runs only after scrolling stops for 100ms
debounce(() => updateActiveSection(), 100);
```

**Trade-off:**
- RAF: Smooth real-time updates, higher CPU usage
- Debounce: Lower CPU, slight lag before highlighting

#### 3. Binary Search for Large Documents

For documents with 100+ headings:

```javascript
// Current: Linear search O(n)
for (let i = headings.length - 1; i >= 0; i--) {
  if (rect.top <= 200) { ... }
}

// Optimized: Binary search O(log n)
function binarySearchActiveHeading(headings, threshold) {
  let left = 0;
  let right = headings.length - 1;
  let result = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const rect = headings[mid].getBoundingClientRect();

    if (rect.top <= threshold) {
      result = mid;
      left = mid + 1;  // Look for a deeper heading
    } else {
      right = mid - 1;
    }
  }

  return headings[result].id;
}
```

**Savings:** 100 headings: 7 iterations vs 50 iterations (average)

---

## Future Improvements

### 1. Smooth Scroll Progress Indicator

Add a visual indicator showing progress through current section:

```
┌─────────────────────────┐
│ ● Introduction          │
│ ━━━━━━━━━━━━━━━━━━━━ 75%│ ← Progress bar
│   ○ Overview            │
│   ○ Goals               │
│ ○ Setup                 │
└─────────────────────────┘
```

### 2. Multi-Level Hierarchy Support

Currently handles h2 and h3. Could extend to h4, h5, h6:

```css
.toc-h4 a.active {
  background: var(--accent-purple);
  padding-left: 60px;  /* Extra indent */
}
```

### 3. Keyboard Navigation

Allow users to navigate TOC with arrow keys:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    navigateToNextSection();
  } else if (e.key === 'ArrowUp') {
    navigateToPreviousSection();
  }
});
```

### 4. URL Hash Sync

Update browser URL hash as active section changes:

```javascript
if (newActiveId !== currentActiveId) {
  currentActiveId = newActiveId;
  history.replaceState(null, null, `#${currentActiveId}`);
}
```

Benefits:
- Shareable URLs point to specific sections
- Browser back/forward buttons work
- Maintains reading position on reload

### 5. Reading Time Estimates

Show estimated reading time per section:

```
┌─────────────────────────┐
│ ● Introduction (2 min)  │
│ ○ Setup (5 min)         │
│ ○ Advanced (15 min)     │
└─────────────────────────┘
```

Calculate by word count:
```javascript
const wordCount = section.textContent.split(/\s+/).length;
const readingTime = Math.ceil(wordCount / 200);  // 200 WPM average
```

### 6. Intersection Observer Hybrid

Use Intersection Observer for initial visibility, then RAF for precise tracking:

```javascript
// IO: Detect when headings enter/exit viewport (coarse)
// RAF: Track exact position within visible headings (fine)

observer.observe(heading);  // Knows heading is "somewhere visible"
// Then on scroll:
if (visibleHeadings.has(heading.id)) {
  const rect = heading.getBoundingClientRect();  // Precise position
}
```

Benefits:
- Fewer `getBoundingClientRect()` calls (only on visible headings)
- IO handles off-screen detection efficiently
- RAF provides smooth tracking within viewport

---

## Debugging Tips

### Enable Visual Debugging

Add this to help diagnose issues:

```javascript
function updateActiveSection() {
  const headings = Array.from(document.querySelectorAll('h2[id], h3[id]'));

  console.group('🔍 Scroll Debug');
  console.log('Scroll position:', window.scrollY);

  headings.forEach((h, i) => {
    const rect = h.getBoundingClientRect();
    const isActive = rect.top <= 200;
    console.log(
      `${i}. ${h.id}:`,
      `top=${rect.top.toFixed(0)}px`,
      isActive ? '✅ ACTIVE' : '⚪'
    );
  });

  console.groupEnd();
}
```

Output:
```
🔍 Scroll Debug
Scroll position: 1250
0. intro: top=-800px ⚪
1. features: top=150px ✅ ACTIVE
2. installation: top=600px ⚪
3. conclusion: top=1500px ⚪
```

### Test Edge Cases

```javascript
// Scroll to very top
window.scrollTo(0, 0);
// Expected: First heading should be active

// Scroll to very bottom
window.scrollTo(0, document.body.scrollHeight);
// Expected: Last heading should be active

// Scroll to middle of very long section
// Expected: Same heading should stay active throughout
```

---

## Conclusion

**What we built:** A scroll-tracking TOC that accurately highlights the current section as users read through documentation.

**Key insights:**
1. `getBoundingClientRect()` is the most reliable position method for scroll tracking
2. Backward loops find the deepest/most accurate section
3. Change detection prevents unnecessary DOM thrashing
4. RequestAnimationFrame maintains smooth scrolling performance
5. Simple solutions often beat complex ones (Intersection Observer was overkill)

**Final algorithm:**
- Loop backward through headings
- Find last heading ≤ 200px from viewport top
- Update highlighting only when active section changes
- Throttle with RAF

**Performance:** O(n) per scroll frame, typically 5-10 iterations with early break

**Future:** Could optimize further with caching, debouncing, or binary search for very large documents

---

*Created: 2026-01-12*
*Document Type: Technical Architecture & Learning Documentation*
*Complexity: Intermediate*
