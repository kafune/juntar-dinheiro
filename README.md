# Juntar Dinheiro (PWA offline)

Este app e uma PWA simples para marcar depositos de 1 a 110.
Os dados ficam no armazenamento local do navegador (sem internet).

## Como usar

1. Abra esta pasta no terminal.
2. Rode um servidor local:

```
python3 -m http.server 8080
```

3. Abra no navegador: http://localhost:8080

No iPhone, abra no Safari e use "Add to Home Screen" para instalar.

## Publicar no GitHub Pages (HTTPS)

1. Crie um repositorio no GitHub (ex: `juntar-dinheiro`).
2. No terminal, dentro desta pasta:

```
git init
git add .
git commit -m "PWA juntar dinheiro"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/juntar-dinheiro.git
git push -u origin main
```

3. No GitHub: Settings > Pages > Source: `main` / `root` > Save.
4. Aguarde o link aparecer (ex: `https://SEU_USUARIO.github.io/juntar-dinheiro/`).

Depois, no iPhone/Android, abra esse link uma vez e use "Add to Home Screen".
O app vai abrir offline.
