# Chinese name font

Noto Serif SC Bold (700), subset to 周思博 by the Google Fonts CSS API.
Self-hosted so the header does not depend on a visitor's installed Chinese fonts
or on a third-party font request. The subset only covers these three characters.

Source: https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&text=%E5%91%A8%E6%80%9D%E5%8D%9A&display=swap

Upstream: https://github.com/google/fonts/tree/main/ofl/notoserifsc

License: SIL Open Font License 1.1; see OFL.txt.

## Chinese pages

Noto Sans SC (400 and 500) is used for Chinese body text and navigation;
Noto Serif SC (400) is used for Chinese page headings. Latin text retains the
same fonts as the English pages. These self-hosted subsets cover the Chinese
characters used in the page content, avoiding third-party requests by visitors.
System Chinese fonts provide a fallback for new characters until regeneration.

Traditional Chinese uses Noto Sans TC (400 and 500) and Noto Serif TC (400),
with regional glyph forms matching the Traditional Chinese copy. The editorial
translations are maintained in `app/languages.ts`.

After changing Chinese copy, run `node scripts/update-chinese-fonts.mjs` to
regenerate all six page subsets from the official Google Fonts CSS API.
Upstream sans-serif font: https://github.com/google/fonts/tree/main/ofl/notosanssc
Both families use the SIL Open Font License 1.1. See OFL.txt for Noto Serif SC
and OFL-NotoSansSC.txt for Noto Sans SC, including their copyright notices.
For Traditional Chinese, see OFL-NotoSansTC.txt and OFL-NotoSerifTC.txt.
