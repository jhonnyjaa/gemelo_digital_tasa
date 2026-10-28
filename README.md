# Gemelo digital del almacén

React 19 + TypeScript + three.js (react-three-fiber, drei, postprocessing) + Tailwind 4 + motion + cmdk.
Todo corre en local; los datos quedan en el navegador (IndexedDB / localStorage).

```
npm install
npm run dev      # http://localhost:5173
npm run build
npm run prod     # compila y sirve en http://localhost:4173 (mucho más fluido que dev)
```

**Rendimiento:** usa `npm run prod` para el uso diario; `npm run dev` corre React en modo desarrollo y es varias veces más lento.
La calidad gráfica es *Auto* por defecto (sube o baja según los FPS) y se puede fijar en Capas → Calidad. `?q=low` fuerza calidad baja.
Tema claro/oscuro: botón en la barra superior (se recuerda).

## Uso
- **Ctrl K** (o `/`): buscar por código, descripción, lote o ubicación. Enter vuela hasta la caja; pasar el mouse muestra un tooltip y clic abre el inspector.
- **Datos**: subir los Excel de SAP (ZMMR0080, MB52, ZFIR0241; el tipo se detecta por los encabezados). Cada archivo reemplaza los datos de su transacción. "Demo" genera datos sintéticos.
- **Racks**: editar niveles/columnas, posición, paso y fondo; agregar/eliminar racks; exportar/importar JSON.
- **Capas**: paredes, techo, mezanine superior, montacargas, personas, calidad gráfica.
- Teclado: WASD/flechas, Q/E altura, Shift rápido.

## Configuración
`src/config/warehouse.config.json` (generado por `tools/gen-config.mjs`; se puede editar a mano o desde la UI):
racks, zonas, alias de ubicaciones, contorno del edificio, pasillos peatonales y pasos de cebra, escaleras, oficinas, rutas de montacargas, personas y la escala (`scale` = m por px del plano).
Coordenadas en px de `plano_actualizado.jpg` mostrada a 2000x1000. El piso se pinta desde esta config (`src/lib/floor.ts`); la imagen ya no se usa como textura.

## Tránsito
Los montacargas usan carriles propios (`forklifts[].route`); las personas caminan por pasillos peatonales y cruzan los carriles solo en los pasos de cebra.
Un montacargas frena y espera si hay una persona o equipo a menos de 5.5 m al frente; las personas esperan si un montacargas en movimiento se acerca.

## Reglas de ubicación
- `001-A-003` → rack 001, nivel A (piso), columna 003. Se aceptan variantes sin ceros (`1-a-3`).
- Columna 001 = extremo de la flecha del plano; los cortes de los racks son pasajes y la numeración continúa.
- Mezanine: cada "columna" = 6 niveles x 7 subcolumnas; las letras continúan entre columnas (A-F, G-L, M-R) y la subcolumna es 001-007.
- Ubicación de texto (p. ej. `PATIO EXT`) → zona por nombre/alias (`aliases`).
- Ubicación inválida o no reconocida → "Zona virtual" (norte del edificio) y se lista en Datos (exportable a CSV).
- Ubicación vacía → no se dibuja (solo se cuenta).
- Una caja por (tipo, código, ubicación); los lotes se listan en el detalle. Un activo con subnúmeros es una sola caja.
- Números SAP: coma = miles, punto = decimal, negativo al final (`129,358.27-`).

## Oficinas, zonas dinámicas y recorrido a pie

- **Oficinas**: el bloque de oficinas es un solo edificio. Planta baja: activos y recepción (cubos con ventanas grandes de atención), SSHH y Electrónicos. Segundo piso: Operaciones, Planificación, Jefatura y Sala de reuniones, con paredes, puertas y ventanas definidas en `warehouse.config.json` (`zones[].build` y `upperFloor.rooms[].openings`).
- **Escaleras** (`stairs`): la de oficinas sube pegada al bloque y llega frente a la puerta de la sala de reuniones; la de mezanine arranca en la puerta de Electrónicos y desemboca frente a los racks.
- **Zonas dinámicas**: toda ubicación SAP que no sea un rack ni una zona conocida crea sola una zona al norte del edificio (`dynamicArea`), con tamaño según la cantidad de cajas. En el panel *Zonas* se puede fijar como zona permanente.
- **Zonas y ubicaciones SAP**: en el panel *Zonas* cada espacio del piso tiene su texto SAP (p. ej. `INSUMOS`); al cargar el Excel, los artículos con esa ubicación aparecen en la cuadrícula del piso.
- **Recorrer** (tecla `F` o botón): primera persona con WASD, Shift para correr, ratón para mirar, colisión con racks y paredes, y escaleras transitables. Los montacargas ceden el paso al visitante. `Esc` para salir.
