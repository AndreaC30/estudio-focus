# Foco — temporizador de estudio

Aplicación web sencilla para estudiar en bloques cortos. Está pensada para personas que se distraen con facilidad: en lugar de intentar concentrarse una hora seguida, trabajas en intervalos breves con pausas claras.

## Qué hace

- Temporizador con bloques de **10, 15 o 25 minutos** (o duración personalizada).
- Campo para escribir **qué vas a hacer** en ese bloque.
- **Modo foco**: oculta el resto de la interfaz y deja solo el reloj y los controles esenciales.
- **Avisos persistentes** al terminar un bloque o un descanso: no desaparecen solos; hay que confirmarlos.
- **Descanso automático** después de cada bloque (por defecto 5 minutos; configurable: 3, 10 o personalizado).
- **Estadísticas del día**: bloques completados y minutos acumulados (se guardan en el navegador).
- Aviso si cambias de pestaña mientras el temporizador está en marcha.

## Cómo usarla

1. Escribe en "Ahora mismo voy a…" la tarea concreta de ese bloque.
2. Elige la duración (por defecto, 10 minutos).
3. Pulsa **Empezar**.
4. Opcional: activa **Modo foco** para reducir distracciones.
5. Cuando termine el bloque, confirma el aviso y descansa 5 minutos.
6. Repite con el siguiente bloque.

### Atajos de teclado

| Tecla | Acción |
|-------|--------|
| Espacio | Iniciar o pausar |
| Esc | Salir del modo foco |

## Uso en línea

Si el sitio está publicado (GitHub Pages o Vercel), se abre directamente en el navegador sin instalar nada.

## Uso local

Puedes abrir `index.html` directamente o servir la carpeta con un servidor local:

```bash
python -m http.server 4173
```

Luego abre `http://localhost:4173` en el navegador.

## Tecnología

Proyecto estático sin dependencias:

- `index.html` — estructura
- `styles.css` — estilos
- `app.js` — lógica del temporizador

Los datos de estadísticas se guardan en `localStorage` del navegador. No hay backend ni base de datos.

## Licencia

Uso personal. Proyecto creado para estudio y productividad individual.
