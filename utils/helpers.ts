export function esc(s: any): string {
  return String(s)
    .replace(/&/g, '\u0026')
    .replace(/"/g, '\u0022')
    .replace(/</g, '\u003c');
}

export function setVal(id: string, val: any): void {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.value = val ?? '';
}

export function getVal(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement;
  return el ? el.value : '';
}

export function debounce<T extends Function>(func: T, wait: number): T {
  let timeout: number;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  }) as T;
}