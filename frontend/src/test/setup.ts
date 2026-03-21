import '@testing-library/jest-dom/vitest'

// Mock scrollIntoView which jsdom doesn't implement
Element.prototype.scrollIntoView = () => {}

// Ensure localStorage is available
const store: Record<string, string> = {}
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    },
    writable: true,
  })
}
