"""Check the decoded output, including every GIF background margin and seam."""
from pathlib import Path
import hashlib,json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SAMPLES=ROOT/'samples'

def digest(image):
    return hashlib.sha256(image.tobytes()).hexdigest()

def margins(image):
    w,h=image.size
    # The shared camera leaves at least 20 px horizontally / 22 px vertically.
    # These four 18 px strips are outside every fish in every source frame.
    return tuple(image.crop(box).tobytes() for box in ((0,0,w,18),(0,h-18,w,h),(0,0,18,h),(w-18,0,w,h)))

def verify():
    manifest=json.loads((SAMPLES/'manifest.json').read_text())
    results={'stills':[],'animations':[]}
    assert len(manifest['stills'])==12
    assert len(manifest['animations'])==8
    for entry in manifest['stills']:
        with Image.open(SAMPLES/entry['file']) as image:
            assert image.size==(1200,720),entry['file']
            assert image.getbbox(),entry['file']
            results['stills'].append({'file':entry['file'],'size':list(image.size),'sha256':digest(image.convert('RGB'))})
    for entry in manifest['animations']:
        with Image.open(SAMPLES/entry['file']) as gif:
            assert gif.info.get('loop')==0,entry['file']
            assert gif.size==(manifest['width'],manifest['height'])
            first=gif.convert('RGB').copy()
            expected=margins(first)
            hashes=[];duration=0;identical_margins=0
            for i in range(gif.n_frames):
                gif.seek(i)
                frame=gif.convert('RGB')
                assert margins(frame)==expected,f"Paper changed in {entry['file']} frame {i}"
                identical_margins+=1
                hashes.append(digest(frame))
                duration+=gif.info.get('duration',0)
            assert hashes[0]==hashes[-1],f"Loop seam changed: {entry['file']}"
            assert len(set(hashes))>=manifest['steps'],f"Missing motion: {entry['file']}"
            assert duration==entry['durationMs'],f"Wrong duration: {entry['file']}"
            assert len(set(e['sha256'] for e in entry['geometry']))==manifest['steps']+1
            results['animations'].append({'file':entry['file'],'frames':gif.n_frames,'distinctFrames':len(set(hashes)),
                'durationMs':duration,'loop':0,'backgroundMarginsIdenticalInFrames':identical_margins,
                'firstAndLastFrameIdentical':True,'allGeometryStepsUnique':True,'bytes':(SAMPLES/entry['file']).stat().st_size})
    for file in ('gallery.jpg','drawing-and-painting.jpg'):
        with Image.open(SAMPLES/file) as image:
            assert min(image.size)>300
    (SAMPLES/'verification.json').write_text(json.dumps(results,indent=2)+'\n')
    print(f"Verified {len(results['stills'])} stills and {len(results['animations'])} loops: every decoded paper margin is unchanged, all loop seams match, and all steps contain generated geometry.")

if __name__=='__main__':verify()
