s=open('src/app.html').read()
s=s.replace('/*ENGINE*/',open('src/engine.js').read()).replace('/*REFS*/',open('src/refs.js').read())
open('index.html','w').write(s)
