# Chinese name calligraphy

The current masks (`zhou-v2.png`, `si-v2.png`, `bo-v2.png`) were extracted from the user-supplied `ZHOU.png`, `SI.png`, and `BO.png` with the built-in image-editing tool. The original files had brown paper backgrounds. CSS uses the cutouts' alpha channels and the site's `--ink` color; individual scales and positions balance the visible strokes. Earlier assets are retained for recovery.

## Edit prompts

### Zhou

Use case: background-extraction. Edit target: the supplied historical calligraphy image ZHOU.png. Make a faithful transparent-background cutout of ONLY its existing ink strokes, the character 周. Remove all brown parchment/fabric, surrounding paper, and background texture. Preserve the exact calligraphic structure, all stroke positions, proportions, irregular edges, and ink detail of the supplied character; do not reinterpret, redraw, typeset, modernize, or replace with another rendition. Recolor the surviving strokes uniformly charcoal #242622, retaining antialiased edge transparency. Output one isolated character on a genuinely transparent PNG canvas, centered with a small clear margin, no other text, no shadow, no outline, no backdrop. This is an extraction of the actual supplied strokes for a website name, not generation of new calligraphy.

### Si

Use case: background-extraction. Edit target: supplied SI.png. Extract ONLY the original ink strokes of 思 from its brown paper background, producing a genuinely transparent PNG. Preserve the exact original calligraphy, stroke placement, shapes, irregular edges, proportions and all interior openings. Remove the brown paper, texture and border completely. Do not redraw, typeset, reinterpret or replace the character. Recolor the existing ink charcoal #242622 with antialiased transparent edges. Center the isolated original character with a small even clear margin. No added strokes, background, shadow or other text. Intended as the middle character of a website name.

### Bo

Use case: background-extraction. Edit target: supplied BO.png historical calligraphy. Extract ONLY the original ink strokes of 博 onto a genuinely transparent PNG. Remove the tan/brown paper and background texture completely. Preserve exact stroke placement, silhouette, proportions, interior openings, irregular edges, and the original calligraphic rendition. Do not redraw, typeset, reinterpret or modernize the character. Recolor existing strokes charcoal #242622 with antialiased edge transparency. Output one centered character with small clear margins, no added strokes, border, shadow or background. This is a faithful extraction for the last character of a website name.
