/**
 * Hand-drawn 24×24 glyphs for travel/packing categories, plus a couple of
 * one-off marks (map pin, globe). These exist as raw SVG strings — not Vue
 * components — because TravelMapView needs to interpolate them into Leaflet
 * divIcon/popup HTML, which can't render Vue components. TravelIcon.vue
 * renders the same strings via v-html for use inside normal templates, so
 * every surface (list rows, chips, map pins) stays visually consistent.
 */

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${body}</svg>`

export const CATEGORY_ICON_SVG: Record<string, string> = {
  flight: svg('<path d="M2 21l21-9L2 3v7l15 2-15 2z"/>'),
  hotel: svg(
    '<rect x="2" y="16" width="20" height="2" rx="1"/>' +
    '<rect x="2" y="10" width="7" height="6" rx="2"/>' +
    '<rect x="9" y="12" width="13" height="4" rx="1"/>' +
    '<rect x="3" y="18" width="1.6" height="3"/>' +
    '<rect x="19.4" y="18" width="1.6" height="3"/>',
  ),
  dining: svg(
    '<rect x="8" y="2" width="1.6" height="7" rx="0.8"/>' +
    '<rect x="10.2" y="2" width="1.6" height="7" rx="0.8"/>' +
    '<rect x="12.4" y="2" width="1.6" height="7" rx="0.8"/>' +
    '<rect x="8" y="8" width="6" height="1.8" rx="0.9"/>' +
    '<rect x="10.2" y="9" width="1.6" height="13" rx="0.8"/>',
  ),
  attraction: svg('<polygon points="12,2 14.9,8.6 22,9.3 16.5,14 18.2,21 12,17.3 5.8,21 7.5,14 2,9.3 9.1,8.6"/>'),
  transport: svg(
    '<rect x="2" y="5" width="20" height="11" rx="3"/>' +
    '<circle cx="6.5" cy="18" r="2.2"/>' +
    '<circle cx="17.5" cy="18" r="2.2"/>',
  ),
  shopping: svg(
    '<polygon points="6,8 18,8 19,21 5,21"/>' +
    '<path d="M9 8V6.5C9 4.6 10.3 3 12 3s3 1.6 3 3.5V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ),
  entertainment: svg(
    '<rect x="3" y="9" width="18" height="12" rx="1.5"/>' +
    '<rect x="3" y="4" width="18" height="4" rx="1" transform="rotate(-6 3 8)"/>',
  ),
  nature: svg('<path d="M12 2C6 6 6 14 12 22C18 14 18 6 12 2Z"/>'),
  other: svg('<circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>'),
}

export const PACKING_ICON_SVG: Record<string, string> = {
  clothing: svg('<polygon points="9,3 15,3 15,5 19,7 16,9 16,22 8,22 8,9 5,7 9,5"/>'),
  toiletries: svg(
    '<rect x="9.5" y="2" width="5" height="2.5" rx="1"/>' +
    '<polygon points="9,4.5 15,4.5 17,8 17,21 7,21 7,8"/>',
  ),
  documents: svg(
    '<rect x="5" y="2" width="14" height="20" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M15 2v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.4"/>' +
    '<line x1="8" y1="15" x2="16" y2="15" stroke="currentColor" stroke-width="1.4"/>',
  ),
  health: svg(
    '<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<rect x="11" y="7.5" width="2" height="9" rx="1"/>' +
    '<rect x="7.5" y="11" width="9" height="2" rx="1"/>',
  ),
  electronics: svg('<polygon points="13,2 4,14 11,14 9,22 20,9 12,9"/>'),
  misc: svg(
    '<polygon points="12,3 21,7.5 21,16.5 12,21 3,16.5 3,7.5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2"/>' +
    '<line x1="12" y1="12" x2="3" y2="7.5" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2"/>' +
    '<line x1="12" y1="12" x2="21" y2="7.5" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2"/>',
  ),
}

export const PIN_ICON_SVG = svg('<path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/>')

export const CALENDAR_ICON_SVG = svg(
  '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
  '<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.6"/>' +
  '<line x1="7" y1="2.5" x2="7" y2="6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
  '<line x1="17" y1="2.5" x2="17" y2="6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
)

export const GLOBE_ICON_SVG = svg(
  '<g fill="none" stroke="currentColor" stroke-width="1.5">' +
  '<circle cx="12" cy="12" r="9"/>' +
  '<ellipse cx="12" cy="12" rx="9" ry="4"/>' +
  '<line x1="12" y1="3" x2="12" y2="21"/>' +
  '<path d="M12 3c-3 3-3 15 0 18"/>' +
  '<path d="M12 3c3 3 3 15 0 18"/>' +
  '</g>',
)

export const getCategoryIconSvg = (cat?: string | null): string =>
  (cat && CATEGORY_ICON_SVG[cat]) || PIN_ICON_SVG

export const getPackingIconSvg = (cat?: string | null): string =>
  (cat && PACKING_ICON_SVG[cat]) || PACKING_ICON_SVG.misc
