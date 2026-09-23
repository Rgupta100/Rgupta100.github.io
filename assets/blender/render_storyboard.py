from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent
names=['overview','experience','projects','skills','contact']
board=Image.new('RGB',(1600,380),(16,17,18));draw=ImageDraw.Draw(board)
for i,name in enumerate(names):
    im=Image.open(root/(name+'-transparent.png')).convert('RGBA');im.thumbnail((320,320),Image.Resampling.LANCZOS);board.paste(im,(i*320,20),im);draw.text((i*320+20,352),f'{i+1:02d}  {name.upper()}',fill=(218,222,225))
board.save(root/'storyboard.png')
im=Image.open(root/'overview-transparent.png').convert('RGBA');background=Image.new('RGBA',im.size,(16,17,18,255));background.alpha_composite(im);background.convert('RGB').save(root/'overview-composited-evidence.png')
