export function construireLienPartie(codePartie: string): string {
  return `${window.location.origin}?partie=${codePartie}`
}
