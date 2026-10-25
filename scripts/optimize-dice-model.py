"""Drop unused UV streams from the texture-free dice, retaining all rendered bytes.

No mesh simplification, quantization or runtime decoder is introduced.
The Blender export remains the source at public/models/dice.glb.
"""
from pathlib import Path
from copy import deepcopy
import json
import struct

root = Path(__file__).resolve().parents[1]
source = root / "public/models/dice.glb"
target = source.with_name("dice-display.glb")
data = source.read_bytes()
magic, version, length = struct.unpack_from("<III", data)
assert (magic, version, length) == (0x46546C67, 2, len(data))
json_length, json_type = struct.unpack_from("<II", data, 12)
assert json_type == 0x4E4F534A
original = json.loads(data[20:20 + json_length])
bin_length, bin_type = struct.unpack_from("<II", data, 20 + json_length)
assert bin_type == 0x004E4942
binary = data[28 + json_length:28 + json_length + bin_length]
assert not any(original.get(key) for key in ("textures", "images", "animations", "skins"))
assert len(original["buffers"]) == 1 and "uri" not in original["buffers"][0]
assert set(original.get("extensionsUsed", [])) <= {"KHR_materials_clearcoat"}
model = deepcopy(original)
retained = set()
for mesh in model["meshes"]:
    for primitive in mesh["primitives"]:
        assert not primitive.get("targets") and not primitive.get("extensions")
        primitive["attributes"] = {key: value for key, value in primitive["attributes"].items() if not key.startswith("TEXCOORD_")}
        retained.update(primitive["attributes"].values())
        retained.add(primitive["indices"])

accessor_map = {old: new for new, old in enumerate(sorted(retained))}
views = sorted({original["accessors"][index]["bufferView"] for index in retained})
view_map = {old: new for new, old in enumerate(views)}
new_binary = bytearray()
model["bufferViews"] = []
for index in views:
    view = deepcopy(original["bufferViews"][index])
    offset = view.get("byteOffset", 0)
    raw = binary[offset:offset + view["byteLength"]]
    new_binary.extend(b"\0" * (-len(new_binary) % 4))
    view["byteOffset"] = len(new_binary)
    new_binary.extend(raw)
    model["bufferViews"].append(view)
    assert new_binary[view["byteOffset"]:view["byteOffset"] + view["byteLength"]] == raw

model["accessors"] = []
for index in sorted(retained):
    accessor = deepcopy(original["accessors"][index])
    assert not accessor.get("sparse")
    accessor["bufferView"] = view_map[accessor["bufferView"]]
    model["accessors"].append(accessor)
for mesh in model["meshes"]:
    for primitive in mesh["primitives"]:
        primitive["attributes"] = {key: accessor_map[value] for key, value in primitive["attributes"].items()}
        primitive["indices"] = accessor_map[primitive["indices"]]
model["buffers"][0]["byteLength"] = len(new_binary)
new_binary.extend(b"\0" * (-len(new_binary) % 4))
encoded = json.dumps(model, separators=(",", ":"), ensure_ascii=False).encode()
encoded += b" " * (-len(encoded) % 4)
result = (struct.pack("<III", magic, version, 28 + len(encoded) + len(new_binary))
          + struct.pack("<II", len(encoded), json_type) + encoded
          + struct.pack("<II", len(new_binary), bin_type) + new_binary)
target.write_bytes(result)
assert len(result) < len(data)
print(f"dice: {len(data):,} -> {len(result):,} bytes; all positions, normals, colors, indices and materials unchanged")
