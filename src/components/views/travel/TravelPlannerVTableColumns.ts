import { HiearchicalCountry } from '@/constants/HierarchicalCountry'
import {
  TableV2FixedDir,
  type Column,
  ElDatePicker,
  ElCascader,
  type CascaderValue,
  type CascaderOption,
  ElButton,
  ElTimePicker,
  ElInput,
  ElUpload,
  type UploadUserFile,
} from 'element-plus'
import { h } from 'vue'
import { View, Delete, Upload } from '@element-plus/icons-vue'
import { FileUtils } from '@/utilities/FileUtils'

export function createTravelPlannerVTableColumns(
  addAgendaItem: () => void,
  removeAgendaItem: (id: string) => void,
  getDateRange: () => { startDate?: number; endDate?: number; unknownDate?: boolean } = () => ({}),
): Column<any>[] {
  return [
    {
      key: 'date',
      title: 'Date',
      dataKey: 'date',
      width: 125,
      fixed: TableV2FixedDir.LEFT,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) return h('span', '')

        const { startDate, endDate, unknownDate } = getDateRange()

        const toLocalMidnight = (ts: number) => {
          const d = new Date(ts)
          d.setHours(0, 0, 0, 0)
          return d.getTime()
        }

        const disabledDate = (unknownDate || (!startDate && !endDate))
          ? undefined
          : (time: Date) => {
              const t = time.getTime()
              if (startDate && t < toLocalMidnight(startDate)) return true
              if (endDate && t > toLocalMidnight(endDate)) return true
              return false
            }

        const toDateObj = (val: any): Date | null => {
          if (!val) return null
          const d = new Date(val)
          return isNaN(d.getTime()) ? null : d
        }

        const toLocalDateStr = (d: Date | null): string => {
          if (!d) return ''
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }

        return h(ElDatePicker, {
          modelValue: toDateObj(rowData.date),
          'onUpdate:modelValue': (val: Date | null) => {
            rowData.date = toLocalDateStr(val)
          },
          type: 'date',
          placeholder: 'Select date',
          style: 'width: 100%',
          size: 'small',
          defaultValue: startDate ? new Date(startDate) : new Date(),
          disabledDate,
        })
      },
    },

    {
      key: 'city',
      title: 'City',
      dataKey: 'city',
      width: 300,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) return h('span', '')
        return h(ElCascader, {
          modelValue: rowData.cityRaw ?? [],
          'onUpdate:modelValue': (val: CascaderValue | null | undefined) => {
            rowData.city = val ? JSON.stringify(val) : ''
            rowData.cityRaw = val ?? []
          },
          options: HiearchicalCountry as unknown as CascaderOption[],
          placeholder: 'Select City',
          style: 'width: 100%',
          size: 'small',
          props: { checkStrictly: true },
          clearable: true,
        })
      },
    },

    {
      key: 'startTime',
      title: 'Start Time',
      dataKey: 'startTime',
      width: 110,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) return h('span', '')
        return h(ElTimePicker, {
          modelValue: rowData.startTime,
          'onUpdate:modelValue': (val: string) => {
            rowData.startTime = val
          },
          placeholder: 'Time',
          style: 'width: 100%',
          size: 'small',
          format: 'HH:mm',
          'value-format': 'HH:mm',
        })
      },
    },

    {
      key: 'title',
      title: 'Title',
      dataKey: 'title',
      width: 150,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) return h('span', '')
        return h(ElInput, {
          modelValue: rowData.title,
          'onUpdate:modelValue': (val: string) => {
            rowData.title = val
          },
          placeholder: 'Title',
          size: 'small',
        })
      },
    },

    {
      key: 'remarks',
      title: 'Remarks',
      dataKey: 'desc',
      width: 150,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) return h('span', '')
        return h(ElInput, {
          modelValue: rowData.desc,
          'onUpdate:modelValue': (val: string) => {
            rowData.desc = val
          },
          placeholder: 'Remarks',
          size: 'small',
        })
      },
    },

    {
      key: 'Files',
      title: 'Files',
      dataKey: 'files',
      width: 150,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) {
          return h('span', '')
        }

        if (!Array.isArray(rowData.files)) {
          rowData.files = []
        }

        const fileCount = rowData.files.length

        // Generate file icons
        const fileIcons = rowData.files.map((_: any, index: any) => h(Document))

        console.log('Rendering files for row:', rowData, 'File Icons:', fileIcons)

        return h(
          'div',
          {
            style: 'display:flex; align-items:center; justify-content:center; gap:6px;',
          },
          [
            h(
              ElUpload,
              {
                fileList: rowData.files,
                'onUpdate:fileList': async (files: UploadUserFile[]) => {
                  console.log('File list')
                  // const processedFile = await FileUtils.convertFileToBase64(files[0].raw as File)
                  // rowData.files = processedFile.map((f) => ({
                  //   file: f.raw,
                  //   previewUrl: URL.createObjectURL(f.raw),
                  //   name: f.name,
                  //   mimeType: f.raw.type,
                  //   sizeInBytes: f.raw.size,
                  //   status: 'uploaded',
                  //   blob: processedFile,
                  // }))
                },
                autoUpload: false,
                showFileList: false,
                limit: 2,
              },
              {
                default: () =>
                  h(ElButton, {
                    size: 'small',
                    type: 'primary',
                    icon: Upload,
                  }),
              },
            ),

            // Render icons only if files exist
            ...(fileCount > 0 ? fileIcons : []),

            h('span', `${fileCount} file(s)`),
          ],
        )
      },
    },

    {
      key: 'operations',
      title: 'Actions',
      width: 120,
      align: 'center',
      fixed: TableV2FixedDir.RIGHT,
      cellRenderer: ({ rowData }) => {
        if (rowData.isAddRow) {
          return h(
            ElButton,
            {
              type: 'primary',
              link: true,
              onClick: addAgendaItem,
            },
            { default: () => '+ Add Item' },
          )
        }

        return h('div', { style: 'display:flex; justify-content:center; gap:6px' }, [
          h(ElButton, {
            size: 'small',
            icon: View,
            circle: true,
            onClick: () => console.log('Viewing agenda:', rowData),
          }),
          h(ElButton, {
            size: 'small',
            type: 'danger',
            icon: Delete,
            circle: true,
            onClick: () => removeAgendaItem(rowData.id),
          }),
        ])
      },
    },
  ]
}
