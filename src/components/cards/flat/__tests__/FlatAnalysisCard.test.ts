import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ElementPlus, { ElSlider } from 'element-plus'
import type { OneMapResult } from '@/interfaces/OneMapResult.model'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/interceptors/HttpClient', () => ({ default: http }))

import FlatAnalysisCard from '../FlatAnalysisCard.vue'
import BusstopInformationComponent from '../BusstopInformationComponent.vue'

const result: OneMapResult = {
  SEARCHVAL: '', BLK_NO: '123', ROAD_NAME: 'ANG MO KIO AVE 3', BUILDING: 'NIL', ADDRESS: '', POSTAL: '560123',
  X: '', Y: '', LATITUDE: '1.37', LONGITUDE: '103.84',
}

function mockLta() {
  http.get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/lta/mrt-stations/nearest') {
      return { data: { data: { stations: [{ station: 'Ang Mo Kio', type: 'MRT', distanceM: 321 }] } } }
    }
    if (url === '/lta/bus-stops/nearby') {
      return {
        data: {
          data: {
            count: 1,
            busStops: [{ busStopCode: '54009', roadName: 'Ang Mo Kio Ave 3', description: 'AMK Int', distanceM: 88 }],
          },
        },
      }
    }
    if (url === '/lta/bus/services' && config?.params?.busStopCode === '54009') {
      return { data: { data: { services: [{ serviceNo: '73' }, { serviceNo: '162' }] } } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
}

describe('FlatAnalysisCard — LTA nearby endpoints', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    mockLta()
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('loads the nearest MRT stations via GET with lat/lng/limit params and renders distanceM', async () => {
    wrapper = mount(FlatAnalysisCard, { props: { result }, global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(http.get).toHaveBeenCalledWith('/lta/mrt-stations/nearest', { params: { lat: '1.37', lng: '103.84', limit: 3 } })
    expect(http.post).not.toHaveBeenCalled()
    expect(wrapper.find('.mrt-tag').text()).toContain('Ang Mo Kio')
    expect(wrapper.find('.mrt-dist').text()).toBe('~321m')
  })

  it('loads nearby bus stops and their services via GET when the radius changes', async () => {
    wrapper = mount(FlatAnalysisCard, { props: { result }, global: { plugins: [ElementPlus] } })
    await flushPromises()
    const slider = wrapper.findComponent(ElSlider)
    slider.vm.$emit('update:modelValue', 500)
    slider.vm.$emit('change', 500)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/lta/bus-stops/nearby', { params: { lat: '1.37', lng: '103.84', radius: 500 } })
    expect(http.get).toHaveBeenCalledWith('/lta/bus/services', { params: { busStopCode: '54009' } })
    expect(http.post).not.toHaveBeenCalled()

    const stops = wrapper.findComponent(BusstopInformationComponent)
    expect(stops.props('records')).toHaveLength(1)
    expect(stops.props('busServices')).toEqual({ '54009': [{ serviceNo: '73' }, { serviceNo: '162' }] })
  })

  it('a failing services call leaves that stop with no services', async () => {
    http.get.mockImplementation(async (url: string) => {
      if (url === '/lta/mrt-stations/nearest') return { data: { data: { stations: [] } } }
      if (url === '/lta/bus-stops/nearby') {
        return { data: { data: { count: 1, busStops: [{ busStopCode: '1', roadName: 'R', description: 'D', distanceM: 5 }] } } }
      }
      throw new Error('boom')
    })
    wrapper = mount(FlatAnalysisCard, { props: { result }, global: { plugins: [ElementPlus] } })
    await flushPromises()
    wrapper.findComponent(ElSlider).vm.$emit('change', 500)
    await flushPromises()
    expect(wrapper.findComponent(BusstopInformationComponent).props('busServices')).toEqual({ '1': [] })
  })
})

describe('BusstopInformationComponent — camelCase fields', () => {
  it('renders code, road, description, whole-metre distance and service numbers', () => {
    const wrapper = mount(BusstopInformationComponent, {
      props: {
        records: [{ busStopCode: '54009', roadName: 'Ang Mo Kio Ave 3', description: 'AMK Int', distanceM: 88 }],
        busServices: { '54009': [{ serviceNo: '73' }, { serviceNo: '162' }] as never },
      },
      global: { plugins: [ElementPlus] },
    })
    expect(wrapper.find('.busstop-code').text()).toBe('54009')
    expect(wrapper.find('.busstop-road').text()).toBe('Ang Mo Kio Ave 3')
    expect(wrapper.find('.busstop-distance').text()).toBe('~ 88 m')
    expect(wrapper.find('.busstop-desc').text()).toBe('AMK Int')
    expect(wrapper.find('.bus-services-label').text()).toContain('2')
    expect(wrapper.findAll('.bus-services-grid .el-tag').map((t) => t.text())).toEqual(['73', '162'])
  })
})
