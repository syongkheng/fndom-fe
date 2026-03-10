import { HiearchicalCountry } from '@/constants/HierarchicalCountry'

export function useCityLabel() {
  const resolveCityLabel = (valuePath: string[]): string | null => {
    if (!valuePath?.length) return null
    let options: any[] = HiearchicalCountry as unknown as any[]
    let label: string | null = null
    for (const val of valuePath) {
      const found = options.find((o) => o.value === val)
      if (!found) return valuePath[valuePath.length - 1]
      label = found.label
      options = found.children ?? []
    }
    return label
  }

  const getCardCity = (item: any): string | null => {
    const raw: string[] | null =
      item.cityRaw?.length
        ? item.cityRaw
        : (() => {
            const src = item.city ?? item.city_raw
            if (!src) return null
            try { return JSON.parse(src) } catch { return null }
          })()
    return resolveCityLabel(raw ?? [])
  }

  return { resolveCityLabel, getCardCity }
}
