/**
 * Profile-local exclusivity. Only the peer's enabled field may be changed.
 * Normal writes disable the peer before enabling self; rendering fails closed
 * during legacy conflicts (Kinich wins ties) and while a view is unavailable.
 */
export async function mutateThemeScope(scope, ops, revision) {
 if (typeof scope.mutate === "function") return scope.mutate(ops, revision);
 const before = scope.getSnapshot().value ?? {}, applied = [];
 try {
  for (const op of ops) {
   if (op.op !== "set" || op.path.length !== 1) throw new Error("Unsupported legacy theme operation");
   const field = op.path[0];
   if (await scope.set(field, op.value) === false) throw new Error("Theme setting was refused");
   applied.push(field);
  }
  return true;
 } catch (cause) {
  let partial = false;
  for (const field of applied.reverse()) {
   try { if (!Object.hasOwn(before, field) || await scope.set(field, before[field]) === false) partial = true; }
   catch { partial = true; }
  }
  throw Object.assign(new Error("Theme settings write failed", { cause }), { partial });
 }
}

export function exclusiveSettings(own, peer, { winsTie = false } = {}) {
 const peerEnabled = snapshot => snapshot?.status !== "unavailable" && (snapshot?.value?.enabled === true ||
  (snapshot?.value?.enabled === undefined && typeof snapshot?.value?.visualStyle === "string"));
 let cachedOwn, cachedPeer, cached;
 const snapshot = () => {
  const a = own.getSnapshot(), b = peer?.getSnapshot?.();
  if (a === cachedOwn && b === cachedPeer && cached) return cached;
  cachedOwn = a; cachedPeer = b;
  if (!a.value) return cached = a;
  const enabled = a.status !== "unavailable" && b?.status !== "loading" && a.value.enabled === true && (!peerEnabled(b) || winsTie);
  return cached = enabled === a.value.enabled ? a : { ...a, value: { ...a.value, enabled } };
 };
 let chain = Promise.resolve();
 const mutate = (ops, revision) => {
  const copied = structuredClone(ops);
  const run = async () => {
   if (copied.some(op => op.op === "set" && op.path.length === 1 && op.path[0] === "enabled" && op.value === true)) {
    const other = peer?.getSnapshot?.();
    if (other?.status === "loading") throw new Error("Theme settings are still loading");
    if (peerEnabled(other) && other.value.enabled === undefined) throw new Error("Update the peer theme before switching: this version has no theme-level switch");
    if (peerEnabled(other) && other.writable === false) throw new Error("The other theme cannot be disabled in this Profile");
    if (peerEnabled(other)) {
     const accepted = await mutateThemeScope(peer, [{ op: "set", path: ["enabled"], value: false }]);
     if (accepted === false) throw new Error("The other theme could not be disabled");
    }
   }
   return mutateThemeScope(own, copied, revision);
  };
  const next = chain.then(run, run); chain = next.catch(() => {}); return next;
 };
 return {
  getSnapshot: snapshot,
  subscribe(listener) {
   const a = own.subscribe(listener), b = peer?.subscribe?.(listener);
   return () => { a?.(); b?.(); };
  },
  mutate,
  set: (field, value) => mutate([{ op: "set", path: [field], value }])
 };
}

/** Brand slots disappear with the enabled setting, restoring native fallbacks. */
export function registerEnabledBrand(ctx, settings, definition, component) {
 return installEnabledThemeEffect(settings, () => ctx.slots.register(definition, component));
}

/** Own interaction listeners only while the effective theme is active. */
export function installEnabledThemeEffect(settings, install) {
 let release = null;
 const sync = () => {
  const enabled = settings.getSnapshot().value?.enabled === true;
  if (enabled && release === null) release = install();
  else if (!enabled && release !== null) { release(); release = null; }
 };
 sync();
 const unsubscribe = settings.subscribe(sync);
 return () => { unsubscribe(); release?.(); release = null; };
}

