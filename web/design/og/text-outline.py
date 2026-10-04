"""Render original font outlines to SVG; no system-font matching or fallback."""
from pathlib import Path
from io import BytesIO
from math import ceil
import sys, json, html, unicodedata
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import ImageFont

web = Path(__file__).resolve().parents[2]
fonts = {}
for key, source in [('display', web/'src/app/fonts/BeautiqueDisplay-Regular.woff2'), ('body', web/'design/og/fonts/BeVietnamPro-Regular.ttf')]:
    font = TTFont(source)
    units = font['head'].unitsPerEm
    font.flavor = None
    data = BytesIO()
    font.save(data)
    data.seek(0)
    fonts[key] = dict(font=font, units=units, cmap=font.getBestCmap(), glyphs=font.getGlyphSet(), measure=ImageFont.truetype(data, units), cache={})

def measure(font, text, size):
    return font['measure'].getlength(text, features=['-liga', '-clig']) * size / font['units']

def wrap(font, text, size, width):
    lines = []
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split(' '):
            candidate = (line + ' ' + word).strip()
            if line and measure(font, candidate, size) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    return lines

def render(request):
    font = fonts[request['font']]
    size = request['size']
    text = unicodedata.normalize('NFC', request['text'])
    for char in text.replace('\n', ''):
        if ord(char) not in font['cmap']:
            raise ValueError('Missing original font glyph: '+repr(char))
    lines = text.split('\n')
    if request.get('fit'):
        while max(measure(font, line, size) for line in lines) > request['fit'] and size > 62:
            size -= 2
    if request.get('wrap'):
        lines = wrap(font, text, size, request['wrap'])
    scale = size / font['units']
    paths = []
    xmin, ymin, xmax, ymax = float('inf'), float('inf'), float('-inf'), float('-inf')
    for row, line in enumerate(lines):
        baseline = row * size * 1.15
        for index, char in enumerate(line):
            glyph = font['cmap'][ord(char)]
            if glyph not in font['cache']:
                svg = SVGPathPen(font['glyphs'])
                bounds = BoundsPen(font['glyphs'])
                font['glyphs'][glyph].draw(svg)
                font['glyphs'][glyph].draw(bounds)
                font['cache'][glyph] = (svg.getCommands(), bounds.bounds)
            commands, bounds = font['cache'][glyph]
            if not bounds:
                continue
            x = measure(font, line[:index+1], size) - measure(font, char, size)
            a,b,c,d = bounds
            xmin, xmax = min(xmin, x+a*scale), max(xmax, x+c*scale)
            ymin, ymax = min(ymin, baseline-d*scale), max(ymax, baseline-b*scale)
            paths.append(f'<path d="{commands}" transform="translate({x:.4f} {baseline:.4f}) scale({scale:.6f} {-scale:.6f})"/>')
    width, height = ceil(xmax-xmin)+2, ceil(ymax-ymin)+2
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{xmin-1:.4f} {ymin-1:.4f} {width} {height}"><g fill="{html.escape(request["color"],quote=True)}">'+''.join(paths)+'</g></svg>'
    return dict(svg=svg, width=width, height=height, fontSize=size, lines=lines)

json.dump([render(request) for request in json.load(sys.stdin)], sys.stdout, ensure_ascii=False)
