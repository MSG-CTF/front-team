# Challenge selection asset refinement

Date: 2026-09-29
Mode: built-in image_gen, transparent image edits

Scope: challenge-selection cards, its decorative squirrel, and the moving board piece
The original Figma PNGs and legacy piece-squirrel.png remain unchanged on disk
The refined images are derived artwork, not direct Figma exports

## Delivered assets

| File | Generated PNG source |
| --- | --- |
| challenge-card-brown-refined.webp | exec-6559498c-78bb-447d-ac16-0a945bd99bb3.png |
| challenge-card-slate-refined.webp | exec-db46c78e-2d0d-497c-b655-62cee52d9b5e.png |
| challenge-card-olive-refined.webp | exec-2f6efb93-ed15-4fa4-84e9-f905e2e10880.png |
| selection-squirrel-refined.webp | exec-8b8a7265-4af2-4c3a-91c0-cfe603aeceac.png |

Files live beside this note in public/assets/board
Generated masters remain in the local Codex generated_images/019f87aa-d320-7991-82d0-ec900969ca20 directory
WebP encoding: quality 90, alphaQuality 100, effort 6; original pixel dimensions retained
No rescaling, alpha thresholding or matte compositing is applied during encoding

## Integration

- Card surface and selected sheen use the same asset alpha mask
- The arbitrary rounded-rectangle crop was removed so the gold trim is not cut off
- Pick effects remain outside the surface mask; text remains live DOM content
- BoardPiece also uses selection-squirrel-refined.webp after the user clarified that the moving piece was the intended target
- Its alpha silhouette is x208..1075, y48..1202 in a 1211×1299 canvas (alpha threshold 128)
- Width 6% of the track preserves the previous visible size; the mirrored silhouette center is anchored with translate(-47.02725%, -48.113934%) scaleX(-1)
- The 36 cell coordinates and movement path are unchanged
- Alegreya and the existing Figma-based card positions are retained

## Final prompts

### Brown card

```text
Use case: precise-object-edit
Asset type: high-resolution transparent fantasy game challenge card, blank UI artwork
Input image 1: existing brown card, the edit target and strict composition reference
Primary request: refine this exact card into a crisp production-quality asset and remove the unwanted rectangular background outside its rounded silhouette. Keep the same warm chestnut brown leather/paper material, thin antique-gold double frame, delicate corner flourishes, centered small gold crown and horizontal gold divider. Refine blurry goldwork into clean, fine engraving and reduce muddy noise while keeping the established autumn fantasy appearance.
Composition: straight front view, no perspective. One portrait card, same width:height ratio as the reference (188:253). Fill the image closely with the entire card visible and only a tiny even transparent margin. Crown stays centered around 14% down the card. Divider stays at 38% of the card height. Leave all the title/category zones empty and low contrast; actual text is overlaid by the app.
Constraints: preserve the frame shape, proportions, ornament positions, color, and existing design identity. All pixels outside the actual rounded card must be genuinely transparent. Clean antialiased edge, NO pale/white fringe, NO rectangular matte, NO external outline, NO baked outer shadow/glow. Keep the thin gold ornamental border on the card itself. No letters, numbers, new symbols, gems, badges, objects or watermark. This is a refinement of the supplied asset, not a redesign.
```

### Slate card

```text
Use case: precise-object-edit
Asset type: high-resolution transparent fantasy game challenge card, blank UI artwork
Input image 1: refined brown card, edit target; preserve all its geometry, framing, engravings, crown and divider exactly
Input image 2: original card showing the required material color
Primary request: create one matching color variant of Image 1. Keep the same polished and sharply engraved antique-gold double frame, corner flourishes, small centered crown, and divider. Change only the inner leather/paper color to match Image 2; gold ornaments stay antique gold. Keep subtle, restrained leather texture and quiet blank areas for live text.
Composition: exactly the same front view, portrait 188:253 proportions and tight framing as Image 1. Crown center remains 14% down, divider 38% down. No perspective, no changes in decoration scale or placements.
Constraints: no text, numbers, badges, extra icons or objects. All outside pixels transparent, with clean antialiased rounded silhouette, no pale fringe, NO rectangular matte, no exterior outline and no baked shadow/glow. This is one blank card asset, not a UI screenshot. Preserve all other aspects of Image 1.
Interior color: muted charcoal slate with a slightly warm grey-green cast, like Image 2. The overall fill is dark grey, not blue.
```

### Olive card

```text
Use case: precise-object-edit
Asset type: high-resolution transparent fantasy game challenge card, blank UI artwork
Input image 1: refined brown card, edit target; preserve all its geometry, framing, engravings, crown and divider exactly
Input image 2: original card showing the required material color
Primary request: create one matching color variant of Image 1. Keep the same polished and sharply engraved antique-gold double frame, corner flourishes, small centered crown, and divider. Change only the inner leather/paper color to match Image 2; gold ornaments stay antique gold. Keep subtle, restrained leather texture and quiet blank areas for live text.
Composition: exactly the same front view, portrait 188:253 proportions and tight framing as Image 1. Crown center remains 14% down, divider 38% down. No perspective, no changes in decoration scale or placements.
Constraints: no text, numbers, badges, extra icons or objects. All outside pixels transparent, with clean antialiased rounded silhouette, no pale fringe, NO rectangular matte, no exterior outline and no baked shadow/glow. This is one blank card asset, not a UI screenshot. Preserve all other aspects of Image 1.
Interior color: deep muted olive-green leather, like Image 2. The overall fill is moss olive, not bright emerald or yellow.
```

### Squirrel

```text
Use case: identity-preserve
Asset type: transparent high-resolution 3D squirrel mascot cutout for an autumn fantasy game UI
Input image 1: the existing squirrel figure, edit target and strict character reference
Primary request: faithfully refine this same squirrel into a detailed, clean game asset and remove all background/fringe. Preserve its identity exactly: golden-brown fur, same swept spiky head tuft and rounded ears, big dark expressive eyes, cream muzzle and belly, same cheeks, tiny paws holding the same acorn, huge fluffy curled tail rising behind on the viewer's right, same standing pose and three-quarter view, same engraved circular antique-gold pedestal.
Style: charming polished 3D game figurine, soft warm illumination and rich but restrained material detail. Improve fur, eye highlights, acorn and engraved base definition without changing proportions or hairstyle.
Composition: entire figure and circular base visible, centered, close crop with about 4% transparent padding; portrait asset. No separate scene, floor, extra leaves or objects.
Constraints: genuine transparent background including between tail/body and paws. Remove pale/white edge contamination and any rectangular matte; no sticker outline, no external white rim, no baked outer shadow or glow. Do not redesign the squirrel, alter the tuft, turn it into a different character, change expression/pose, add clothing or text. Preserve the reference's autumn brown and gold palette.
```
