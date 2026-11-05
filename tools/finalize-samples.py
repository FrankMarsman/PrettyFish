"""Encode compact repository stills; retain full resolution and fine ink detail."""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SAMPLES=ROOT/'samples'
manifest=json.loads((SAMPLES/'manifest.json').read_text())

def jpeg(relative):
    source=SAMPLES/relative
    if source.suffix=='.jpg':return relative
    target=source.with_suffix('.jpg')
    with Image.open(source) as image:
        image.convert('RGB').save(target,quality=96,subsampling=0,optimize=True)
    source.unlink()
    return target.relative_to(SAMPLES).as_posix()

for entry in manifest['stills']:
    entry['file']=jpeg(entry['file'])
    entry['encoding']='JPEG quality 96, 4:4:4, full 1200 × 720 resolution'
for relative in ('gallery.png','drawing-and-painting.png'):
    if (SAMPLES/relative).exists():jpeg(relative)
for entry in manifest['animations']:
    entry['bytes']=(SAMPLES/entry['file']).stat().st_size
(SAMPLES/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(SAMPLES/'stills.json').write_text(json.dumps(manifest['stills'],indent=2)+'\n')
(SAMPLES/'animations.json').write_text(json.dumps(manifest['animations'],indent=2)+'\n')
print('Finalized repository stills as full-resolution JPEGs.')
