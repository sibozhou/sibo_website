# Chinese calligraphy assets

The current masks (`zhou-v2.png`, `si-v2.png`, `bo-v2.png`) were extracted from the user-supplied `ZHOU.png`, `SI.png`, and `BO.png` with the built-in image-editing tool. The original files had brown paper backgrounds. CSS uses the cutouts' alpha channels and the site's `--ink` color; individual scales and positions balance the visible strokes. Earlier assets are retained for recovery.

The research-title masks (`yan-v1.png`, `jiu-v1.png`) were extracted from the user-supplied `Yan.png` and `Jiu.png`. The built-in editor isolated the original strokes; because its returned files contained a rendered transparency grid rather than an alpha channel, a deterministic luminance threshold converted only that grid to transparency. CSS again supplies the visible ink color.

The Notes-title masks (`sui-v1.png`, `ji-v1.png`) were extracted from the user-supplied crops of 隨 and 記 with the built-in image-editing tool. `sui-v1.png` uses the user's final, more clearly defined 隨 crop. Both returned PNGs contain real alpha transparency. CSS uses the alpha channels as masks, applies the site's ink color, and compensates for the substantially different clear margins in the two source crops.

## Edit prompts

### Zhou

Use case: background-extraction. Edit target: the supplied historical calligraphy image ZHOU.png. Make a faithful transparent-background cutout of ONLY its existing ink strokes, the character 周. Remove all brown parchment/fabric, surrounding paper, and background texture. Preserve the exact calligraphic structure, all stroke positions, proportions, irregular edges, and ink detail of the supplied character; do not reinterpret, redraw, typeset, modernize, or replace with another rendition. Recolor the surviving strokes uniformly charcoal #242622, retaining antialiased edge transparency. Output one isolated character on a genuinely transparent PNG canvas, centered with a small clear margin, no other text, no shadow, no outline, no backdrop. This is an extraction of the actual supplied strokes for a website name, not generation of new calligraphy.

### Si

Use case: background-extraction. Edit target: supplied SI.png. Extract ONLY the original ink strokes of 思 from its brown paper background, producing a genuinely transparent PNG. Preserve the exact original calligraphy, stroke placement, shapes, irregular edges, proportions and all interior openings. Remove the brown paper, texture and border completely. Do not redraw, typeset, reinterpret or replace the character. Recolor the existing ink charcoal #242622 with antialiased transparent edges. Center the isolated original character with a small even clear margin. No added strokes, background, shadow or other text. Intended as the middle character of a website name.

### Bo

Use case: background-extraction. Edit target: supplied BO.png historical calligraphy. Extract ONLY the original ink strokes of 博 onto a genuinely transparent PNG. Remove the tan/brown paper and background texture completely. Preserve exact stroke placement, silhouette, proportions, interior openings, irregular edges, and the original calligraphic rendition. Do not redraw, typeset, reinterpret or modernize the character. Recolor existing strokes charcoal #242622 with antialiased edge transparency. Output one centered character with small clear margins, no added strokes, border, shadow or background. This is a faithful extraction for the last character of a website name.

### Yan

Use case: background-extraction. Asset type: Chinese research-page title mask. Edit target: the supplied historical calligraphy image Yan.png. Extract ONLY the original light ink strokes of the character 研 from the opaque gray background onto a genuinely transparent PNG. Preserve the exact existing calligraphy: every stroke position, contour, proportion, irregular edge, interior opening, and worn texture. Do not redraw, reinterpret, typeset, modernize, repair, add, or remove any stroke. Remove the gray background and all surrounding texture completely. Recolor the surviving strokes uniformly charcoal #242622 while retaining antialiased transparent edges. Center the isolated original character with a small clear margin. No background, shadow, outline, border, watermark, or other text.

### Jiu

Use case: background-extraction. Asset type: Chinese research-page title mask. Edit target: the supplied historical calligraphy image Jiu.png. Extract ONLY the original light ink strokes of the character 究 from the opaque gray background onto a genuinely transparent PNG. Preserve the exact existing calligraphy: every stroke position, contour, proportion, irregular edge, interior opening, and worn texture. Do not redraw, reinterpret, typeset, modernize, repair, add, or remove any stroke. Remove the gray background and all surrounding texture completely. Recolor the surviving strokes uniformly charcoal #242622 while retaining antialiased transparent edges. Center the isolated original character with a small clear margin. No background, shadow, outline, border, watermark, or other text.

### Sui

Use case: background-extraction. Asset type: final replacement Chinese Notes-page title mask. Extract ONLY the exact existing dark ink strokes of 隨 from the newest user-supplied crop onto a genuinely transparent PNG. Remove the mottled pale paper, colored noise, grain, stains, texture, border, and every background pixel. Preserve the original calligraphy exactly: all stroke positions, contours, proportions, irregular and bristled edges, ink variation, and interior openings. Do not redraw, repair, reinterpret, typeset, modernize, smooth, add, or remove strokes. Recolor the surviving strokes uniformly charcoal #242622 while retaining natural antialiased transparent edges. Center the unchanged character with a small transparent margin. Output exactly one character: 隨. No background, shadow, outline, border, watermark, checkerboard, or other text.

### Ji

Use case: background-extraction. Asset type: Chinese Notes-page title mask. Select the user-supplied tan-paper source showing 記, with the abbreviated 言 radical on the left and 己 component on the right. Extract ONLY its exact existing dark ink strokes onto a genuinely transparent PNG. Remove the paper, texture, stains, cropped neighboring mark, border, and every background pixel. Preserve the original calligraphy exactly; do not redraw, repair, reinterpret, typeset, modernize, add, or remove strokes. Recolor the surviving strokes uniformly charcoal #242622 while retaining antialiased transparent edges. Center the unchanged character with a small transparent margin. Output exactly one character: 記. No background, shadow, outline, border, watermark, or other text.
