import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';

// A compact airliner silhouette, pointing north in its local surface plane.
const silhouette = new Shape();
const outline = [
  [0, 1.6], [0.16, 1.25], [0.18, 0.42], [1.35, -0.35],
  [1.35, -0.65], [0.18, -0.22], [0.14, -1.02], [0.52, -1.3],
  [0.52, -1.5], [0, -1.32], [-0.52, -1.5], [-0.52, -1.3],
  [-0.14, -1.02], [-0.18, -0.22], [-1.35, -0.65],
  [-1.35, -0.35], [-0.18, 0.42], [-0.16, 1.25],
];
outline.forEach(([x, y], index) => {
  if (index === 0) silhouette.moveTo(x, y);
  else silhouette.lineTo(x, y);
});
silhouette.closePath();
const geometry = new ShapeGeometry(silhouette);
const bodyMaterial = new MeshBasicMaterial({ color: '#67e8f9', side: DoubleSide });
const outlineMaterial = new MeshBasicMaterial({ color: '#082f49', side: DoubleSide });

export function createAircraftMarker() {
  const marker = new Group();
  const border = new Mesh(geometry, outlineMaterial);
  border.scale.set(1.15, 1.15, 1);
  border.position.z = -0.015;
  marker.add(border, new Mesh(geometry, bodyMaterial));
  return marker;
}

export function getAircraftRotation(flight) {
  return { z: -(flight.heading ?? 0) };
}
