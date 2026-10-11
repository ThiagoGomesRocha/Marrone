[Inglés](../../contributing.md)

## ¡Juntos, hagamos a Marrone mejor!

Estamos encantados de que quieras ayudar a mejorar Marrone. A continuación encontrarás las instrucciones para empezar a trabajar con Marrone en tu computadora.

### Tecnologías utilizadas

Marrone está construido con React y Electron

Librerías que utilizamos:

- CSS - Tailwind CSS
- Editores de código - CodeMirror
- Manejo del estado - Redux
- Íconos - Tabler Icons
- Formularios - formik
- Validación de esquemas - Yup
- Cliente de peticiones - axios
- Monitor del sistema de archivos - chokidar
- i18n (internacionalización) - i18next

### Dependencias

> [!IMPORTANT]
> Necesitarás [Node v22.x o la última versión LTS](https://nodejs.org/es/). Ten en cuenta que Marrone usa los espacios de trabajo de npm

## Desarrollo

Marrone es una aplicación de escritorio. A continuación se detallan las instrucciones paso a paso para ejecutar Marrone.

> Nota: Utilizamos React para el frontend y rsbuild para el servidor de desarrollo.

### Instalar dependencias

```bash
# Use la versión 22.x o LTS (Soporte a Largo Plazo) de Node.js
nvm use 22.11.0

# instalar las dependencias
npm i --legacy-peer-deps
```

> ¿Por qué `--legacy-peer-deps`?: Fuerza la instalación ignorando conflictos en dependencias “peer”, evitando errores de árbol de dependencias.

### Desarrollo local

#### Construir paquetes

##### Opción 1

```bash
# construir paquetes
npm run build:graphql-docs
npm run build:marrone-query
npm run build:marrone-common
npm run build:marrone-converters
npm run build:marrone-requests

# empaquetar bibliotecas JavaScript del entorno de pruebas aislado
npm run sandbox:bundle-libraries --workspace=packages/marrone-js
```

##### Opción 2

```bash
# instalar dependencias y configurar el entorno
npm run setup
```

#### Ejecutar la aplicación

```bash
# ejecutar aplicación react (terminal 1)
npm run dev:web

# ejecutar aplicación electron (terminal 2)
npm run dev:electron
```

##### Opción 1

```bash
# ejecutar aplicación react (terminal 1)
npm run dev:web

# ejecutar aplicación electron (terminal 2)
npm run dev:electron
```

##### Opción 2

```bash
# ejecutar aplicación electron y react de forma concurrente
npm run dev
```

#### Personalizar la ruta `userData` de Electron

Si la variable de entorno `ELECTRON_USER_DATA_PATH` está presente y se encuentra en modo de desarrollo, entonces la ruta `userData` se modifica en consecuencia.
ejemplo:

```sh
ELECTRON_USER_DATA_PATH=$(realpath ~/Desktop/marrone-test) npm run dev:electron
```

Esto creará una carpeta llamada `marrone-test` en tu escritorio y la usará como la ruta userData.

### Solución de problemas

Es posible que te encuentres con un error `Unsupported platform` cuando ejecutes `npm install`. Para solucionarlo, tendrás que eliminar las carpetas `node_modules` y el archivo `package-lock.json`, y luego volver a ejecutar `npm install`. Esto debería instalar todos los paquetes necesarios para que la aplicación funcione.

```sh
# Elimina la carpeta node_modules en los subdirectorios
find ./ -type d -name "node_modules" -print0 | while read -d $'\0' dir; do
  rm -rf "$dir"
done

# Elimina el archivo package-lock en los subdirectorios
find . -type f -name "package-lock.json" -delete
```

### Pruebas

#### Pruebas individuales

```bash
# ejecutar pruebas de marrone-app
npm run test --workspace=packages/marrone-app

# ejecutar pruebas de marrone-electron
npm run test --workspace=packages/marrone-electron

# ejecutar pruebas de marrone-cli
npm run test --workspace=packages/marrone-cli

# ejecutar pruebas de marrone-common
npm run test --workspace=packages/marrone-common

# ejecutar pruebas de marrone-converters
npm run test --workspace=packages/marrone-converters

# ejecutar pruebas de marrone-schema
npm run test --workspace=packages/marrone-schema

# ejecutar pruebas de marrone-query
npm run test --workspace=packages/marrone-query

# ejecutar pruebas de marrone-js
npm run test --workspace=packages/marrone-js

# ejecutar pruebas de bruno-lang
npm run test --workspace=packages/marrone-lang

# ejecutar pruebas de marrone-toml
npm run test --workspace=packages/marrone-toml
```
#### Pruebas en conjunto

```bash
# ejecutar pruebas en todos los espacios de trabajo
npm test --workspaces --if-present
```

### Crea un Pull Request

- Por favor, mantén los Pull Request pequeños y enfocados en una sola cosa.
- Por favor, sigue el siguiente formato para la creación de ramas:
  - feature/[nombre de la funcionalidad]: Esta rama debe contener los cambios para una funcionalidad específica.
    - Ejemplo: feature/dark-mode
  - bugfix/[nombre del error]: Esta rama debe contener solo correcciones de errores para un error específico.
    - Ejemplo: bugfix/bug-1
