# ADR-010: Tope diario de peticiones a Gemini con Cloud Quotas

## Contexto

El proyecto de GCP tiene una cuenta de facturación activa, y Gemini cobra por uso. Un
presupuesto de GCP solo avisa: no corta el gasto. Además, con el transporte por Pub/Sub
(ADR-008) un reintento puede volver a llamar a Gemini. El objetivo del portfolio es no pagar,
así que hace falta un límite que se aplique de verdad.

Los límites de la API de Gemini son **por modelo y por tier de facturación**, no globales.
mcp-ai usa tres modelos (`gemini-3.1-flash-lite`, `gemini-3-flash-preview` y
`gemini-2.5-flash-lite`) con fallback entre ellos.

## Decisión

- Un `google_cloud_quotas_quota_preference` por par (cuota, modelo), con valor
  `gemini_daily_request_cap` (150 peticiones/día por defecto). Google rechaza las peticiones
  que superen el límite.
- Cuotas: `GenerateRequestsPerDayPerProjectPerModel-FreeTier` y `-PaidTier2`. Son cinco pares
  aplicados y verificados en GCP (valor preferido y concedido: 150).
- **Quedan fuera dos casos**, de forma deliberada:
  - `PaidTier3`: su límite por defecto es ilimitado y fijarle un tope exige un email de
    contacto. Es un tier de gasto muy alto que un portfolio no alcanza.
  - Free tier de `gemini-2.5-flash-lite`: su límite por defecto ya es 20 al día, y poner 150 sería
    un aumento.
- El recorte es grande (de cientos de miles a 150), así que se usa
  `ignore_safety_checks = "QUOTA_DECREASE_PERCENTAGE_TOO_HIGH"`. La comprobación
  `QUOTA_DECREASE_BELOW_USAGE` sigue activa: no deja bajar un límite por debajo de lo ya usado.
- Terraform habilita `cloudquotas.googleapis.com`.
- La lista de pares es explícita (no un producto cartesiano) para que el código coincida con lo
  aplicado y no intente subir el límite excluido.

## Alternativas consideradas

- **Solo presupuesto de GCP:** avisa, pero no corta el gasto.
- **Límite en Google AI Studio:** no se versiona ni se revisa en un PR, y no se puede
  verificar desde el repositorio.
- **Override de cuota de Service Usage:** el recurso no existe en el provider fijado
  (`hashicorp/google` 5.45.2).
- **Un tope global:** Google no lo permite; los límites son por modelo.

## Consecuencias

- El máximo teórico con el fallback es de 150 × 3 modelos al día. Con 3 análisis por
  organización y día, el uso real queda muy por debajo.
- El tope solo existe tras `terraform apply`, que se ejecuta a mano; el CI no aplica Terraform.
- Si se cambia `GEMINI_MODEL`, hay que actualizar la lista de pares, o el modelo nuevo queda sin
  tope propio.
- Si el proyecto pasara a paid tier 3, el tope no lo cubriría.
