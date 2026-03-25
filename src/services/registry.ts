import type { RegistryEntry, RegistryValue } from '@/types';

export type RegistryService = {
  list(): RegistryEntry[];
  get(key: string): RegistryValue | undefined;
  set(key: string, value: RegistryValue): void;
  delete(key: string): void;
};

type RegistryStore = {
  entries: Record<string, RegistryEntry>;
  set: (key: string, value: RegistryValue) => void;
  remove: (key: string) => void;
  list: () => RegistryEntry[];
  get: (key: string) => RegistryValue | undefined;
};

export function createRegistryService(store: RegistryStore): RegistryService {
  return {
    list(): RegistryEntry[] {
      return store.list();
    },
    get(key: string): RegistryValue | undefined {
      return store.get(key);
    },
    set(key: string, value: RegistryValue): void {
      store.set(key, value);
    },
    delete(key: string): void {
      store.remove(key);
    },
  };
}
