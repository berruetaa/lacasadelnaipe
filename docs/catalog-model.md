# Modelo catalográfico LCDN

## Dos entidades que nunca deben mezclarse

### Referencia

Una `LCDN-REF-*` describe una edición, variante o baraja documentada. Puede existir aunque LCDN no posea ninguna copia.

### Objeto

Un `LCDN-OBJ-*` describe un ejemplar físico concreto bajo custodia de LCDN. Puede apuntar a una referencia, pero conserva identidad, estado y procedencia propios.

Ejemplo:

- `LCDN-REF-000143`: una edición identificada de una baraja.
- `LCDN-OBJ-000287`: ejemplar abierto de esa edición.
- `LCDN-OBJ-000411`: otro ejemplar, sellado.

## IDs

Los identificadores públicos son permanentes, nunca se reciclan y no contienen semántica mutable más allá del tipo de entidad.

Series iniciales:

- `LCDN-REF-000001` — referencia catalográfica
- `LCDN-OBJ-000001` — objeto físico
- `LCDN-DOC-000001` — documento/archivo
- `LCDN-LIB-000001` — biblioteca
- `LCDN-ACC-000001` — accesorio

Colecciones históricas usan códigos explícitos, por ejemplo `LCDN-COL-MSA`, sin reemplazar el ID individual de cada objeto.

## Certeza

Toda atribución puede marcarse como `confirmed`, `highly_probable`, `probable`, `possible` o `unknown`.

La ausencia de información nunca se rellena con una estimación presentada como hecho.

## Conservación

El estado de apertura y la completitud son dimensiones separadas. Un mazo sellado puede tener completitud desconocida y seguir siendo un ejemplar de altísimo valor documental.

Un objeto histórico cerrado no se abre exclusivamente para completar fotografía o inventario. Cualquier intervención futura deberá quedar documentada.

## Procedencia

La procedencia es historia, no un campo de propietario actual. Debe conservar la secuencia conocida de custodios, adquisiciones y transferencias. Una nueva adquisición no borra los eslabones anteriores.

## Privacidad

El catálogo público puede mostrar procedencia histórica cuando sea apropiado, pero nunca ubicación de depósito, datos personales sensibles, precio privado ni notas de seguridad.
