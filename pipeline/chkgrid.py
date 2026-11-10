import sys, glob
from PIL import Image
d = sys.argv[1]; fs = sorted(glob.glob(f'{d}/chk*.jpg'))
g = Image.new('RGB', (len(fs) * 180, 320))
for i, f in enumerate(fs): g.paste(Image.open(f).resize((180, 320)), (i * 180, 0))
g.save(f'{d}/chkgrid.jpg')
