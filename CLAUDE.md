# fndom — Claude Instructions

## i18n rule
- Every user-visible string in templates must use `t('key')` — never hardcode string literals for labels, button text, eyebrow text, messages (ElMessage), or any other user-facing copy.
- When adding new strings, add the key to **both** `src/locales/en.ts` and `src/locales/zh.ts` in the same edit. Missing one is a silent runtime failure, not a build error.

## Mindmap rule
- Before making any file edits, read `/Users/rowense/Desktop/dev/fndom/MINDMAP.md` to orient yourself in the project structure.
- After all edits for a prompt are complete, update `MINDMAP.md` if any structural changes were made — new routes, new components, new stores, new API calls, or changed patterns.
