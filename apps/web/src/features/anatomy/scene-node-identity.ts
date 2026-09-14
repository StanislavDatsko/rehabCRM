import type { Object3D } from 'three';

export function gltfSourceNodeName(object: Object3D): string {
  const sourceName = object.userData.name;
  return typeof sourceName === 'string' && sourceName.length > 0 ? sourceName : object.name;
}

export function findGltfSourceNode(root: Object3D, sourceName: string): Object3D | null {
  let match: Object3D | null = null;
  root.traverse((object) => {
    if (!match && gltfSourceNodeName(object) === sourceName) {
      match = object;
    }
  });
  return match;
}
