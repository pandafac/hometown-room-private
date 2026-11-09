export const visitPath = "/visit";

export function regionPath(regionId) {
  return `/visit/${regionId}`;
}

export function townPath(regionId, townId) {
  return `/visit/${regionId}/${townId}`;
}

export function roomPath(shop) {
  return `/room/${shop.townId}/${shop.id}`;
}

export function cardPath(shop) {
  return `/card/${shop.townId}/${shop.id}`;
}

export function merchantPath(shop) {
  return `/merchant/${shop.regionId}/${shop.townId}/${shop.id}`;
}
