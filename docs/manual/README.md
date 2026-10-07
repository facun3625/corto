# Manual del panel (tienda modelo)

El manual que sirve `/manual` (`src/content/manual-panel.html`) se genera acá. Es genérico: no lleva marcas ni datos reales.

1. **Base de demostración:** `DATABASE_URL=postgresql://…/tienda_demo node tests/e2e/run.cjs docs/manual/seed-demo.ts` (crea "Tienda Modelo" con datos inventados y logo "Tu logo").
2. **Levantar la app contra esa base** (`DATABASE_URL=…/tienda_demo_e2e npm run dev`) y sacar las capturas:
   `node docs/manual/capturas.cjs` y `node docs/manual/capturas-2.cjs` (guardan WebP en `shots/`). `hoja.cjs` arma una hoja de contactos para revisarlas.
3. **Armar el HTML:** `python3 docs/manual/build-manual.py` (incrusta las capturas; falla si aparece alguna marca ajena).

Nunca sacar capturas de la base de desarrollo real.
