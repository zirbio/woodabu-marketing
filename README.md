# Woodabu Marketing Automation Platform

Plataforma de automatización de marketing basada en CLI para [Woodabu](https://woodabu.com) — muebles artesanales y sostenibles hechos en España. Se conecta a Google Ads, Meta, Shopify y GA4 para automatizar la creación de anuncios, programación de redes sociales, campañas de email y reportes de analítica.

**Todo el contenido se genera como borrador/pausado — nada se publica sin aprobación humana.**

## Tabla de contenidos

- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Comandos](#comandos)
- [Testing](#testing)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Integraciones API](#integraciones-api)
- [Seguridad](#seguridad)

## Funcionalidades

- **Generación de RSA en Google Ads** — 15 titulares + 4 descripciones con validación de caracteres, creados como PAUSED
- **Meta Ads** — Variantes de anuncios para múltiples audiencias (eco-conscientes, amantes del diseño, compradores de regalos, renovación del hogar), creados como DRAFT
- **Programación de redes sociales** — Posts con copy, hashtags y horario óptimo de publicación vía Meta Graph API
- **Campañas de email** — Emails basados en MJML con recomendaciones de producto desde Shopify, creados como DRAFT
- **Analítica cross-platform** — Reportes semanales agregados de todos los canales con recomendaciones accionables
- **Contenido alineado con la marca** — Toda la generación se alimenta de las guías de marca, datos reales de rendimiento e insights históricos
- **Revisión humana obligatoria** — Revisar, editar, aprobar, saltar o regenerar cualquier pieza de contenido antes de publicar

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code CLI                         │
│  Comandos: /rsa  /meta-ads  /social  /email  /analytics     │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │     Guías de marca         │
              │   skills/woodabu-brand.md   │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │    Staging / Revisión      │
              │  reviewer.ts + html-preview │
              └─────────────┬──────────────┘
                            │
        ┌───────────┬───────┴───────┬───────────┐
        ▼           ▼               ▼           ▼
  ┌──────────┐ ┌─────────┐  ┌──────────┐ ┌─────────┐
  │Google Ads│ │  Meta    │  │ Shopify  │ │   GA4   │
  │  (gRPC)  │ │(REST v19)│  │(GraphQL) │ │ (gRPC)  │
  └──────────┘ └─────────┘  └──────────┘ └─────────┘
```

## Requisitos previos

- **Node.js** 22 o 24
- **npm** 10+
- Credenciales de API para las plataformas que quieras usar (ver [Instalación](#instalación))

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Rellena las credenciales en `.env`:

| Variable | Descripción |
|----------|-------------|
| `GOOGLE_ADS_CLIENT_ID` | Client ID de OAuth de Google Ads |
| `GOOGLE_ADS_CLIENT_SECRET` | Client secret de OAuth de Google Ads |
| `GOOGLE_ADS_REFRESH_TOKEN` | Refresh token de OAuth de Google Ads |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token de la API de Google Ads |
| `GOOGLE_ADS_CUSTOMER_ID` | ID de cuenta de Google Ads |
| `META_SYSTEM_USER_TOKEN` | Token de System User de Meta (vigencia 60 días) |
| `META_TOKEN_EXPIRY` | Fecha de expiración del token (YYYY-MM-DD) — avisa cuando quedan <7 días |
| `META_AD_ACCOUNT_ID` | ID de cuenta publicitaria de Meta |
| `META_PAGE_ID` | ID de la página de Facebook |
| `META_PAGE_ACCESS_TOKEN` | Access token de la página de Facebook |
| `SHOPIFY_STORE_DOMAIN` | Ej: `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | Access token de la Admin API de Shopify |
| `GA4_PROPERTY_ID` | ID de propiedad de GA4 |
| `GA4_SERVICE_ACCOUNT_KEY_PATH` | Ruta al JSON de service account (por defecto: `credentials/ga4-service-account.json`) |

### 3. Service account de GA4

Coloca el archivo JSON de tu service account de GA4 en `credentials/ga4-service-account.json` (este directorio está en gitignore).

### 4. Verificar instalación

```bash
npm run typecheck   # TypeScript — debe pasar con 0 errores
npm run test        # Ejecutar todos los tests
npm run build       # Compilar a dist/
```

## Uso

Esta plataforma está diseñada para usarse con [Claude Code](https://claude.ai/code) mediante slash commands. Cada comando guía un flujo de generación → revisión → publicación.

```bash
# En Claude Code, ejecuta cualquier comando:
/rsa                        # Generar RSA de Google Ads
/meta-ads                   # Generar variantes de anuncios Meta
/social weekly              # Generar posts semanales
/email campaign [tema]      # Generar campaña de email
/analytics weekly           # Reporte semanal cross-platform
```

## Comandos

### `/rsa` — Responsive Search Ads de Google Ads

Genera 15 titulares (máx. 30 caracteres) + 4 descripciones (máx. 90 caracteres) alimentados por:
- Datos actuales de rendimiento de campañas (CTR, CPC, conversiones, ROAS)
- Catálogo de productos de Shopify
- Guías de marca e insights recientes

Valida límites de caracteres (compatible con Unicode para caracteres en español), presenta en staging para revisión y crea los anuncios como **PAUSED** en Google Ads.

### `/meta-ads` — Publicidad en Meta

Genera variantes de anuncios para 4 segmentos de audiencia:
- Consumidores eco-conscientes
- Amantes del diseño
- Compradores de regalos
- Renovación del hogar / casa nueva

Cada variante incluye texto principal (250 chars), titular (40 chars) y descripción (30 chars). Se crean como **DRAFT** en Meta Ads Manager.

### `/social` — Posts en redes sociales

Subcomandos: `weekly`, `product [nombre]`, `campaign [tema]`

Genera posts con copy, 10–15 hashtags, horario óptimo de publicación y sugerencias de imagen desde Shopify. Los posts se crean como **SCHEDULED** (cancelables desde Meta Business Suite antes de la hora de publicación).

### `/email` — Campañas de email

Subcomandos: `campaign [tema]`, `flow [tipo]`, `newsletter`

Genera 3 variantes de asunto, preheader y cuerpo completo en MJML con recomendaciones de producto desde Shopify. Compila MJML a HTML con vista previa en navegador. Se crea como **DRAFT** en Shopify Email (o proporciona el HTML para copia manual si la API no está disponible).

### `/analytics` — Analítica cross-platform

Subcomandos: `weekly`, `channel [nombre]`, `product [nombre]`, `compare [periodo1] vs [periodo2]`

Obtiene datos de las 4 plataformas y los agrega en un reporte unificado con:
- Gasto total y conversiones por canal
- ROAS por canal
- Mejores y peores performers
- Recomendaciones accionables
- Top productos por unidades vendidas

Guarda insights en `data/insights/` (máximo 12 reportes). Alias de periodos: `last-week`, `last-month`, `last-quarter`, `last-year`.

## Testing

```bash
npm run test              # Ejecutar todos los tests
npm run test:unit         # Solo tests unitarios (excluye e2e)
npm run test:e2e          # Solo tests de integración/e2e
npm run test:watch        # Modo watch
npm run test:coverage     # Con reporte de cobertura
```

Los tests están colocados junto a los archivos fuente (`*.test.ts`) y usan [Vitest](https://vitest.dev/) con [MSW](https://mswjs.io/) para mocking HTTP.

### Categorías de tests

| Categoría | Archivos | Qué cubre |
|-----------|----------|-----------|
| Unitarios | `src/**/*.test.ts` | Comportamiento individual de cada módulo |
| Flujos | `src/__tests__/e2e/flow-*.test.ts` | Workflows end-to-end por comando |
| Cross-módulo | `src/__tests__/e2e/cross-module-*.test.ts` | Integridad de datos y propagación de errores |
| Valores límite | `boundary-values.test.ts` | Casos borde, inputs vacíos, límites máximos |
| Contratos | `contract-api-shapes.test.ts` | Contratos de tipos en respuestas API |
| Resiliencia | `resilience.test.ts` | Lógica de reintento, rate limiting, timeouts |
| Seguridad | `security.test.ts` | Redacción de secretos, path traversal, XSS |
| Snapshots | `snapshot-outputs.test.ts` | Estabilidad de formatos de salida |

## Estructura del proyecto

```
src/
├── apis/                  # Clientes API (uno por plataforma)
│   ├── google-ads.ts      # Cliente gRPC de Google Ads
│   ├── meta.ts            # Meta Graph/Marketing API (REST)
│   ├── shopify.ts         # Shopify Admin GraphQL API
│   └── ga4.ts             # GA4 Data API
├── staging/               # Capa de revisión humana
│   ├── reviewer.ts        # Formato en terminal + flujo de aprobación
│   └── html-preview.ts    # Compilación MJML → HTML para emails
├── analytics/             # Agregación cross-platform
│   ├── aggregator.ts      # Combina datos en WeeklyAggregate
│   └── insights-store.ts  # Almacenamiento en archivos JSON (máx. 12 reportes)
├── utils/
│   ├── auth.ts            # Carga de config + verificación de expiración del token Meta
│   ├── api-retry.ts       # fetchWithRetry con backoff exponencial
│   ├── validators.ts      # Validación de límites de caracteres en Google Ads
│   └── date-parser.ts     # Parseo de periodos para analítica
├── __tests__/e2e/         # Tests de integración y e2e
└── index.ts

commands/                  # Definiciones de slash commands para Claude Code
skills/woodabu-brand.md    # Guías de marca para generación de contenido
data/templates/            # Plantillas MJML de email
data/insights/             # Reportes de analítica almacenados (gitignored)
credentials/               # Archivos de claves OAuth (gitignored)
```

## Integraciones API

| Plataforma | Protocolo | Versión | Paquete npm |
|------------|-----------|---------|-------------|
| Google Ads | gRPC | v17 | `google-ads-api` v23 |
| Meta | REST | Graph API v19.0 | `fetchWithRetry` (built-in) |
| Shopify | GraphQL | Admin API 2025-01 | `@shopify/shopify-api` v13 |
| GA4 | gRPC | Data API v1beta | `@google-analytics/data` v5 |

Todos los clientes API siguen el mismo patrón:
1. Interfaz de configuración con campos tipados
2. Interfaces tipadas para las respuestas
3. Clase con métodos de lectura (obtener datos) y escritura (crear como PAUSED/DRAFT)
4. Reintento automático con backoff exponencial vía `fetchWithRetry`

## Seguridad

### Salvaguardas de publicación

| Plataforma | Se crea como | Acción del usuario requerida |
|------------|-------------|------------------------------|
| Google Ads | `PAUSED` | Activar manualmente en Google Ads |
| Meta Ads | `DRAFT` | Revisar y activar en Ads Manager |
| Meta Posts | `SCHEDULED` | Cancelar antes de la hora de publicación si es necesario |
| Shopify Email | `DRAFT` | Enviar manualmente desde Shopify Email |

### Medidas de seguridad

- **Monitoreo de expiración de tokens** — El System User Token de Meta se verifica en cada ejecución, avisa cuando quedan <7 días
- **Redacción de secretos** — API keys y tokens se eliminan de los mensajes de error y logs
- **Escape de HTML** — Todo el contenido en emails se escapa para prevenir XSS
- **Protección contra path traversal** — El insights store valida que las rutas de archivos no salgan del directorio de datos
- **Sin caché de PII** — Los datos de clientes de Shopify se leen en tiempo de ejecución para segmentación, nunca se persisten localmente
- **Escritura atómica de archivos** — Los insights se escriben a `.tmp` y luego se renombran para prevenir corrupción

## CI/CD

El workflow de GitHub Actions (`.github/workflows/ci.yml`) se ejecuta en push/PR a `main`:

1. Verificación de tipos TypeScript (`tsc --noEmit`)
2. Suite completa de tests (`vitest run`)
3. Verificación de build (`tsc`)

Se prueba contra Node.js 22 y 24.

## Licencia

ISC
