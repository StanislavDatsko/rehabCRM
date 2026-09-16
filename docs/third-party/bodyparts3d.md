# Human Atlas / BodyParts3D attribution

RehabMIS vendors the browser-ready Human Atlas data from
[`ashemag/human-atlas`](https://github.com/ashemag/human-atlas), pinned to
commit `1c38bf35c254a891200d3cedecfd57abebe83d8d`.

The source geometry is **BodyParts3D 4.0**, `isa_BP3D_4.0_obj_99.zip`.

> BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0.

License: <https://creativecommons.org/licenses/by/4.0/>  
Dataset: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>  
Publication: <https://doi.org/10.1093/nar/gkn613>

The Human Atlas application and renderer reference code are MIT licensed by
the upstream authors. The upstream MIT license is preserved in the pinned
source repository and applies to the adapted renderer/data-loading ideas used
here.

The vendored manifest preserves each BodyParts3D source `part.id` and
`conceptId`. These identities are source metadata and are intentionally kept
separate from RehabMIS clinical structure mappings and annotations.
