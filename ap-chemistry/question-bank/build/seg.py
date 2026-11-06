import re,subprocess,sys,html
def lines(y):
    out=subprocess.run(['pdftotext','-bbox-layout',f'{y}.pdf','-'],capture_output=True,text=True).stdout
    pages=[];cur=None
    for m in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">|<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>',out,re.S):
        if m.group(1): cur={'w':float(m.group(1)),'h':float(m.group(2)),'lines':[]};pages.append(cur)
        else:
            t=' '.join(html.unescape(w) for w in re.findall(r'>([^<]*)</word>',m.group(7)))
            cur['lines'].append((float(m.group(3)),float(m.group(4)),float(m.group(5)),float(m.group(6)),t))
    return pages
if __name__=='__main__':
    y=sys.argv[1]
    for i,p in enumerate(lines(y)):
        for x0,y0,x1,y1,t in p['lines']:
            if re.match(r'^(Question\s*)?[1-7][\.\)]\s',t) or re.search(r'END OF EXAM|GO ON TO|Question \d|STOP',t): print(i+1,round(x0),round(y0),t[:70])
