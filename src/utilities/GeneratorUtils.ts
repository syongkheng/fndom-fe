export class GeneratorUtils {
  static generateUUID(): string {
    return crypto.randomUUID()
  }
}
