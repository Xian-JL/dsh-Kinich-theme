/** User-authorized 2.0.2 metadata maintenance ceiling; earlier 2.0 releases remain confirmed. */
export const WALLPAPER_FINAL_VERSION = "2.0.2";
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function assertKinichVersionPolicy(version, stage = "candidate") {
  const match = typeof version === "string" && SEMVER.exec(version);
  if (!match || match[4]?.split(".").some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === "0")) {
    throw new Error(`Invalid Kinich SemVer: ${String(version)}`);
  }
  const core = match.slice(1, 4).map(Number);
  if (core.some(value => !Number.isSafeInteger(value))) throw new Error("Kinich version components must be safe integers");
  if (core[0] > 2 || (core[0] === 2 && (core[1] > 0 || core[2] > 2))) {
    throw new Error(`Kinich ${version} exceeds the final wallpaper version ${WALLPAPER_FINAL_VERSION}`);
  }
  if (!["candidate", "confirmed"].includes(stage)) throw new Error(`Unknown Kinich release stage: ${stage}`);
  if (stage === "confirmed" && !["2.0.0","2.0.1",WALLPAPER_FINAL_VERSION].includes(version)) {
    throw new Error(`The confirmed wallpaper release must be exactly an authorized version: 2.0.0, 2.0.1 or ${WALLPAPER_FINAL_VERSION}`);
  }
  if (stage !== "confirmed" && core[0] === 2 && !match[4]) {
    throw new Error(`${WALLPAPER_FINAL_VERSION} is reserved for final Desktop acceptance and user confirmation`);
  }
  return version;
}
