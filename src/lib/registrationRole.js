export function resolveRegistrationRole({
  requestedRole,
  testSecret,
  configuredTestSecret,
  environment,
}) {
  const canCreateAgent = Boolean(
    environment !== 'production'
    && configuredTestSecret
    && testSecret === configuredTestSecret
    && requestedRole === 'AGENT'
  );

  return canCreateAgent ? 'AGENT' : 'CLIENT';
}
