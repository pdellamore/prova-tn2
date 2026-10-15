import markdown, re, sys, asyncio, base64, pathlib
from playwright.async_api import async_playwright

FONTES = pathlib.Path(__file__).parent / "fonts"

def embutir():
    """Inter em base64 no próprio HTML: o PDF sai igual em qualquer máquina,
    mesmo sem a fonte instalada no sistema."""
    regras = []
    for nome, faixa in (("inter-latin.woff2", "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F, U+2122, U+2191, U+2193, U+2212, U+2215"),
                        ("inter-latin-ext.woff2", "U+0100-02BA, U+1E00-1EFF, U+20A0-20AB, U+2C60-2C7F, U+A720-A7FF")):
        arq = FONTES / nome
        if not arq.exists():
            continue
        b64 = base64.b64encode(arq.read_bytes()).decode()
        regras.append("@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;"
                      f"src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:{faixa};}}")
    return "".join(regras)

CSS = embutir() + """
@page { size: A4; margin: 15mm 14mm 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', 'DejaVu Sans', sans-serif; font-size: 9.6pt; line-height: 1.42; color: #1d1d1f; }
h1 { font-size: 20pt; margin: 0 0 4pt; letter-spacing: -0.3pt; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; padding: 5pt 8pt; background: #1f2a44; color: #fff; border-radius: 3pt; page-break-after: avoid; }
h3 { font-size: 11.6pt; margin: 13pt 0 4pt; color: #1f2a44; border-bottom: 1.5pt solid #c9d1e3; padding-bottom: 2pt; page-break-after: avoid; }
h4 { font-size: 10.2pt; margin: 9pt 0 3pt; color: #2b3a5c; page-break-after: avoid; }
p { margin: 3pt 0 5pt; }
ul, ol { margin: 2pt 0 5pt; padding-left: 15pt; }
li { margin: 1pt 0; }
table { border-collapse: collapse; width: 100%; margin: 5pt 0 8pt; font-size: 8.7pt; page-break-inside: avoid; }
th { background: #e8ecf5; text-align: left; font-weight: 600; }
th, td { border: 0.6pt solid #b9c2d6; padding: 3pt 5pt; vertical-align: top; }
tr:nth-child(even) td { background: #fafbfd; }
.b { display: inline-block; font-size: 7.4pt; font-weight: 700; padding: 1pt 5pt; border-radius: 8pt; margin-right: 4pt; vertical-align: 1pt; letter-spacing: .3pt; }
.E { background: #d62f2f; color: #fff; }
.I { background: #f2b705; color: #2a2000; }
.C { background: #d7d9de; color: #333; }
.cuidado { border-left: 3.5pt solid #d62f2f; background: #fff3f2; padding: 5pt 8pt; margin: 6pt 0 8pt; border-radius: 2pt; page-break-inside: avoid; }
.cuidado::before { content: "⚠ CUIDADO NA PROVA"; display: block; font-weight: 700; color: #b01f1f; font-size: 8.4pt; letter-spacing: .4pt; margin-bottom: 2pt; }
.cuidado p, .cuidado ul { margin: 1pt 0; }
.nota { border-left: 3.5pt solid #6b7fa8; background: #f1f4fa; padding: 5pt 8pt; margin: 6pt 0 8pt; border-radius: 2pt; font-size: 9pt; page-break-inside: avoid; }
.capa { border-bottom: 2pt solid #1f2a44; padding-bottom: 8pt; margin-bottom: 10pt; }
.sub { color: #555; font-size: 10pt; }
.legenda { font-size: 8.8pt; color: #333; margin-top: 6pt; }
.quebra { page-break-before: always; }
.q { page-break-inside: avoid; margin-bottom: 10pt; }
.q p { margin: 2pt 0; }
code { font-family: 'Inter', sans-serif; background: #eef1f7; padding: 0 3pt; border-radius: 2pt; font-size: 9pt; }
strong { font-weight: 650; }
"""

def conv(md_text):
    md_text = md_text.replace('[E]', '<span class="b E">ESSENCIAL</span>')
    md_text = md_text.replace('[I]', '<span class="b I">IMPORTANTE</span>')
    md_text = md_text.replace('[C]', '<span class="b C">COMPLEMENTAR</span>')
    html = markdown.markdown(md_text, extensions=['tables', 'md_in_html', 'attr_list', 'sane_lists'])
    return html

async def main(src, out, title):
    body = conv(open(src, encoding='utf-8').read())
    html = f"<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style></head><body>{body}</body></html>"
    open(out.replace('.pdf', '.html'), 'w', encoding='utf-8').write(html)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.set_content(html, wait_until='load')
        await pg.evaluate('document.fonts.ready')
        await pg.pdf(path=out, format='A4', print_background=True, prefer_css_page_size=True,
                     display_header_footer=True, header_template='<div></div>',
                     footer_template=f"<div style='font-size:7pt;color:#888;width:100%;text-align:center;font-family:Inter,sans-serif'>{title} · <span class='pageNumber'></span>/<span class='totalPages'></span></div>")
        await b.close()

asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3]))
