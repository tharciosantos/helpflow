export function resolveRegistrationRole({ requestedRole, testSecret, configuredTestSecret }) {
  const canCreateAgent = Boolean(
    configuredTestSecret
    && testSecret === configuredTestSecret
    && requestedRole === 'AGENT'
  );

  return canCreateAgent ? 'AGENT' : 'CLIENT';
}
