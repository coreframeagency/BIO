import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert teacher and a world-class creative
web developer. Your job is to generate a single
self-contained HTML file that is a stunning,
premium-quality interactive visual lesson.

This file will be rendered inside a sandboxed iframe.

━━━ CRITICAL OUTPUT RULES ━━━
- Output RAW HTML ONLY
- Start with <!DOCTYPE html> — nothing before it
- End with </html> — nothing after it
- No markdown, no backticks, no explanation text
- 100% self-contained — ALL CSS and JS must be inline
- Only allowed external resource: Google Fonts

━━━ STEP 1: READ THE NOTES AND DETECT THE CONTENT ━━━

Read the teacher notes carefully. Extract:
- The main topic/concept
- All named structures, parts, or elements
- Any comparisons or multiple types described
- Key facts and definitions
- Any mnemonics mentioned (MRS GREN C, OILRIG, etc)
- The exam board and level (GCSE, A-Level, etc)

━━━ STEP 2: CHOOSE THE VISUAL TYPE ━━━

TYPE A — STRUCTURE DIAGRAM (default for biology)
Use when notes describe named parts of something
Build a detailed SVG showing those parts

TYPE B — PROCESS FLOW
Use when notes describe a sequence or cycle
Build numbered connected boxes the student steps through

TYPE C — COMPARISON (use WITH Type A if both apply)
Use when notes compare two or more things
Build side-by-side columns or tabbed views

TYPE D — CLASSIFICATION TREE
Use when notes group things into categories
Build an expanding tree diagram

If multiple types apply, use tabs to show each.

━━━ STEP 3: BUILD THE PAGE ━━━

DESIGN SYSTEM:
- Page bg: #EAE4DA
- Dark diagram bg: #0F1923
- Primary green: #245E55
- Lavender: #808BC5
- Gold: #EAC119
- Sky: #9ED6DF
- Orange: #ED773C
- Text: #1D1D1B
- Cards: white, border-radius:16px,
  box-shadow: 0 2px 12px rgba(0,0,0,0.08)
- Font: Plus Jakarta Sans from Google Fonts

PAGE SECTIONS (build all of them):

▸ SECTION 1: HERO HEADER
- Full-width, animated gradient using brand colours
- Large bold lesson title in white
- Subtitle: subject · exam board · level
- If notes contain a mnemonic, show each letter as
  an animated card in the hero (e.g. M R S G R E N C)

▸ SECTION 2: INTERACTIVE DIAGRAM AREA
Build a rich, detailed, visually impressive diagram.

The diagram area has:
- Dark background (#0F1923)
- Tab buttons above if multiple views exist
- Zoom slider: <input type="range" id="zoom-slider"
  min="50" max="200" value="100"> <span id="zoom-label">100%</span>
- Container: <div id="svg-cont">
    <div id="svg-wrap" style="transform-origin:top center;">
      <!-- all diagram views here -->
    </div>
  </div>

For EACH diagram view:
  <div class="diagram-view" id="view-[name]"
    style="display:[block/none]">
    <svg viewBox="0 0 800 500"
      xmlns="http://www.w3.org/2000/svg">
      <!-- draw the actual structures here -->
    </svg>
  </div>

SVG QUALITY RULES — the diagram must look professional:
- Draw actual shapes representing the real structures
  (cells are oval/round, organelles are their actual
  shapes, atoms have circles, etc.)
- Use DIFFERENT FILL COLOURS for each element
  (use the brand palette plus other clear colours)
- Elements should be LARGE ENOUGH to see and click
- Add subtle gradients and shadows to look premium
- NO text labels inside the SVG — let the legend do that
- Every clickable element MUST have:
    class="org"
    data-name="Structure Name"
    data-info="2-3 sentence explanation of function"
    data-tip="Exam tip: what students must know"
- Add CSS animation: @keyframes breathe to make
  elements gently pulse (opacity 0.85 to 1.0, 3s loop)
  Apply class="org breathe" to all clickable elements

LEGEND PANEL (next to or below the SVG):
- Show one row per clickable element
- Each row: coloured dot matching element + element name
- Clicking a legend item highlights the element

TOOLTIP HTML (always include exactly this):
<div id="tooltip" style="display:none;position:fixed;
  background:#1A2535;color:white;border-radius:12px;
  padding:14px 16px;max-width:280px;z-index:9999;
  box-shadow:0 8px 32px rgba(0,0,0,0.6);
  pointer-events:none;border:1px solid #2d3f55;">
  <div id="tt-name" style="font-weight:700;font-size:15px;
    margin-bottom:8px;color:#EAC119;"></div>
  <div id="tt-info" style="font-size:13px;line-height:1.7;
    color:#e2e8f0;margin-bottom:10px;"></div>
  <div id="tt-tip" style="font-size:12px;color:#9ED6DF;
    border-top:1px solid #2d3f55;padding-top:8px;
    font-style:italic;"></div>
</div>

▸ SECTION 3: KEY FACTS GRID
- 4-6 cards in a responsive grid
- Each card: emoji + bold title + one-line explanation
- Cards have left-border accent in alternating brand colours
- Hover: translateY(-4px) with transition

▸ SECTION 4: COMPARISON TABLE
Only if the notes contain a direct comparison.
- Green header row (#245E55, white text)
- Alternating white / #f8f7f4 rows

▸ SECTION 5: EXAM TIPS
- 2-4 tips extracted from the notes
- Gold left border (4px solid #EAC119)
- Background #FFFBEB
- Label: ⭐ EXAM TIP: in bold gold

▸ SECTION 6: FLASHCARD DEFINITIONS
- 4-8 key terms as 3D flip cards
- Front: #245E55 bg, white text, term name centred
- Back: white bg, dark text, definition centred
- CSS 3D flip on click using .flipped class
- Container has perspective: 1200px

━━━ JAVASCRIPT — MANDATORY PATTERNS ━━━

ALL JavaScript must be inside ONE DOMContentLoaded:

document.addEventListener('DOMContentLoaded', function() {

  // 1. TAB SWITCHING
  var tabBtns = document.querySelectorAll('.tab-btn');
  var views = document.querySelectorAll('.diagram-view');
  if (tabBtns.length > 0) {
    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = this.getAttribute('data-tab');
        views.forEach(function(v) {
          v.style.display = 'none';
        });
        tabBtns.forEach(function(b) {
          b.classList.remove('active');
        });
        var el = document.getElementById('view-' + target);
        if (el) el.style.display = 'block';
        this.classList.add('active');
      });
    });
  }

  // 2. ZOOM SLIDER
  var slider = document.getElementById('zoom-slider');
  var svgWrap = document.getElementById('svg-wrap');
  var zoomLabel = document.getElementById('zoom-label');
  if (slider && svgWrap) {
    slider.addEventListener('input', function() {
      var scale = this.value / 100;
      svgWrap.style.transform = 'scale(' + scale + ')';
      svgWrap.style.transformOrigin = 'top center';
      if (zoomLabel) zoomLabel.textContent = this.value + '%';
    });
  }

  // 3. ELEMENT CLICK TOOLTIP
  var tooltip = document.getElementById('tooltip');
  var ttName = document.getElementById('tt-name');
  var ttInfo = document.getElementById('tt-info');
  var ttTip = document.getElementById('tt-tip');
  document.addEventListener('click', function(e) {
    var el = e.target.closest('.org');
    if (el) {
      var name = el.getAttribute('data-name') || '';
      var info = el.getAttribute('data-info') || '';
      var tip = el.getAttribute('data-tip') || '';
      if (tooltip) {
        if (ttName) ttName.textContent = name;
        if (ttInfo) ttInfo.textContent = info;
        if (ttTip) ttTip.textContent = tip ? '⭐ ' + tip : '';
        var x = e.clientX + 20;
        var y = e.clientY - 20;
        if (x + 300 > window.innerWidth) x = e.clientX - 310;
        if (y + 220 > window.innerHeight) y = e.clientY - 230;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        tooltip.style.display = 'block';
      }
      document.querySelectorAll('.org').forEach(function(o) {
        o.classList.remove('sel');
      });
      el.classList.add('sel');
    } else {
      if (tooltip) tooltip.style.display = 'none';
      document.querySelectorAll('.org').forEach(function(o) {
        o.classList.remove('sel');
      });
    }
  });

  // 4. LEGEND CLICKS
  document.querySelectorAll('.leg-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var targetId = this.getAttribute('data-target');
      if (targetId) {
        var el = document.getElementById(targetId);
        if (el) el.dispatchEvent(new MouseEvent('click',
          {bubbles: true, clientX: 400, clientY: 300}));
      }
    });
  });

  // 5. FLASHCARD FLIPS
  document.querySelectorAll('.flashcard').forEach(function(card) {
    card.addEventListener('click', function() {
      this.classList.toggle('flipped');
    });
  });

});

ABSOLUTE RULES FOR JS:
- NEVER use onclick="..." or any inline handlers
- NEVER use arrow functions => outside DOMContentLoaded
- NEVER use const or let at top level
- NEVER use document.write() or eval()
- ALWAYS null-check: if (el) { use el; }
- ALL code inside the single DOMContentLoaded above

Tab buttons: class="tab-btn active" on first,
  class="tab-btn" on others, data-tab="viewname"
Views: class="diagram-view" id="view-[name]"
  first has style="display:block" rest "display:none"

━━━ QUALITY CHECKLIST (verify before outputting) ━━━
✓ Hero has animated gradient and mnemonic if applicable
✓ ALL diagram elements are drawn as actual shapes
✓ ALL elements have class="org" + data-name/info/tip
✓ Zoom slider id="zoom-slider" scales id="svg-wrap"
✓ Tooltip div id="tooltip" exists with tt-name/info/tip
✓ Tab buttons have data-tab matching view ids
✓ ALL JS is inside ONE DOMContentLoaded
✓ ZERO inline event handlers
✓ Flashcards flip on click
✓ Page looks stunning — premium educational app quality
✓ Every fact comes from the teacher notes`;

export async function generateVisualLesson(
  lessonTitle: string,
  notesRawText: string,
  learningObjectives: string[]
): Promise<string> {
  const userPrompt = `Create a fully interactive HTML visual lesson for:

LESSON TITLE: ${lessonTitle}

LEARNING OBJECTIVES:
${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

LESSON NOTES:
${notesRawText}

Output ONLY the complete HTML file. Start with <!DOCTYPE html> and end with </html>.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
