import { Sprite, SpriteMaterial, SRGBColorSpace, TextureLoader } from 'three';

// Share one texture/material across all vessels. The original PNG keeps its proportions.
const texture = new TextureLoader().load(`${import.meta.env.BASE_URL}vessel.png`);
texture.colorSpace = SRGBColorSpace;
const material = new SpriteMaterial({
  map: texture,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  toneMapped: false,
});

export function createVesselMarker() {
  const marker = new Sprite(material);
  // Globe radius is 100 units: small enough to sit alongside the aircraft markers.
  // World-space sizing scales naturally with the globe and viewport, including phones.
  marker.scale.set(6, 6, 1);
  return marker;
}
