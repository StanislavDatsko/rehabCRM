# Anatomical structures and render mappings

`AnatomicalStructure` is the stable clinical vocabulary. Its code, canonical English name, optional Ukrainian/English display labels, category, laterality, parent, and existing Phase 5/6 `regionCode` are independent of any GLB.

Initial codes include `knee.left`, `knee.right`, `femur.left`, `patella.right`, `deltoid.left`, and `knee_joint.left`. Region structures parent bones, muscles, and joint structures for navigation. This is a practical rehabilitation vocabulary, not a complete scientific ontology.

`AnatomicalModelStructureMapping` maps one exact model version, stable node key, mesh name, and primitive to one canonical structure. Only `EXACT` and `HIGH_CONFIDENCE` mappings enter the runtime endpoint. Phase 7 high-confidence mappings require both an explicit `.l`/`.r` node suffix and an agreeing world-space side; remaining nodes are queued for manual review.

The inspected v1 proposal currently contains 36 mapped structures across 36 mesh instances and 60 primitives. Another 3,008 mesh instances remain unmapped in `assets/anatomy/mappings/manual-review.csv`; 18 navigation or currently unsupported canonical structures have no direct render mapping. The deterministic rule set detected zero side-conflict/absent-node candidates, and no uncertain candidate is promoted to runtime. These numbers describe mapping coverage, not anatomical completeness.

Existing measurements, goals, and prescriptions are not rewritten. Their `regionCode + laterality` pairs resolve to matching structures at read time, preserving historical semantics.
