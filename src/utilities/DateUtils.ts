export class DateUtils {
  static toDateTimeString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes} UTC`
  }

  public static calculateDurationInDays(
    start: Date | string,
    end: Date | string,
    includeEndDate: boolean = true,
  ): number {
    if (!start || !end) return 0

    const startDate = new Date(start)
    const endDate = new Date(end)

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    const timeDiff = endDate.getTime() - startDate.getTime()
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24))

    return includeEndDate ? dayDiff + 1 : dayDiff
  }
}
