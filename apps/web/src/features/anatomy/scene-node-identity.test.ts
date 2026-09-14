import { Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { findGltfSourceNode, gltfSourceNodeName } from './scene-node-identity';

describe('glTF source node identity', () => {
  it('uses the original glTF name preserved by GLTFLoader', () => {
    const node = new Object3D();
    node.name = 'Femur_l';
    node.userData.name = 'Femur.l';

    expect(gltfSourceNodeName(node)).toBe('Femur.l');
  });

  it('finds reviewed raw names after Three.js sanitizes the runtime name', () => {
    const scene = new Group();
    const node = new Object3D();
    node.name = 'Femur_l';
    node.userData.name = 'Femur.l';
    scene.add(node);

    expect(findGltfSourceNode(scene, 'Femur.l')).toBe(node);
    expect(findGltfSourceNode(scene, 'Tibia.l')).toBeNull();
  });
});
