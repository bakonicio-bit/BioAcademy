from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
FILES = ('index.html', 'base.css', 'engine.css', 'experience.css', 'app.js',
         'effects.js', 'sound.js', 'layout.js', 'data.js', 'portraits.js',
         'CREDITS.txt', 'README.md', '.nojekyll')
for filename in FILES:
    shutil.copy2(ROOT / filename, OUT / filename)
shutil.copytree(ROOT / 'assets', OUT / 'assets', dirs_exist_ok=True)
print(f'Built portable website in {OUT}')
