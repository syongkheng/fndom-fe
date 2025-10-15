// Define an enum for storage keys
export enum StorageKey {
  EXISTING_SESSION = 'sessionId',
  JWT = 'token',
}

type StorageType = 'local' | 'session'

export class StorageUtils {
  // Private method to get the appropriate storage
  private static getStorage(type: StorageType): Storage {
    return type === 'local' ? localStorage : sessionStorage
  }

  // Public methods with type safety
  public static get<T>(key: StorageKey, type: StorageType = 'local'): T | null {
    try {
      const value = this.getStorage(type).getItem(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error)
      return null
    }
  }

  public static set<T>(key: StorageKey, value: T, type: StorageType = 'local'): void {
    try {
      const stringValue = JSON.stringify(value)
      this.getStorage(type).setItem(key, stringValue)
    } catch (error) {
      console.error(`Error setting ${key} to storage:`, error)
    }
  }

  public static remove(key: StorageKey, type: StorageType = 'local'): void {
    this.getStorage(type).removeItem(key)
  }

  public static clear(type: StorageType = 'local'): void {
    this.getStorage(type).clear()
  }
}
