// Compara a versão gravada no JWT com a versão atual do usuário.
// Tokens antigos (sem tokenVersion) são sempre considerados inválidos.
export function isTokenVersionCurrent(tokenVersion, currentVersion) {
  if (tokenVersion === undefined || tokenVersion === null) return false;
  return tokenVersion === currentVersion;
}
