export class ListUtils {
  public static makeRange = (start: number, end: number) => {
    const result: number[] = []
    for (let i = start; i <= end; i++) {
      result.push(i)
    }
    return result
  }

  public static joinWithDelimiter = (stringArray: string[], delimitter: string) => {
    return stringArray.join(delimitter)
  }
}
