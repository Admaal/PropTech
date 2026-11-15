# ADR-009: Estado de Terraform en un bucket remoto de GCS

## Contexto

El estado de Terraform vivía en `terraform.tfstate`, un fichero local ignorado por git.
Eso tiene tres problemas: si se pierde la máquina se pierde el estado, solo se puede aplicar
desde esa máquina, y no hay historial para recuperar un estado anterior. El CI no aplica
Terraform, así que cada cambio de infraestructura depende de una persona con ese fichero.

## Decisión

- El estado vive en un backend `gcs`: bucket `gen-lang-client-0665399020-tfstate`, prefijo
  `terraform/state`.
- El bucket se crea **fuera de Terraform** (huevo y gallina: Terraform necesita el bucket para
  guardar su propio estado). Es privado (prevención de acceso público activada, acceso uniforme
  a nivel de bucket) y tiene versionado activado para poder recuperar versiones anteriores.
- El backend de GCS bloquea el estado durante `plan` y `apply`, así que dos aplicaciones
  simultáneas no se pisan.
- El CI sigue usando `terraform init -backend=false`: valida el código sin tocar el estado.
- Se migró el estado existente con `terraform init -migrate-state` (45 recursos), tras guardar
  una copia del fichero local.
- Para aplicar desde una máquina: `gcloud auth application-default login`, o
  `GOOGLE_OAUTH_ACCESS_TOKEN` para un comando suelto.

## Alternativas consideradas

- **Mantener el estado local:** descartada por el riesgo de pérdida y por depender de una sola
  máquina.
- **Versionar el estado en el repositorio:** descartada; el estado puede contener valores
  sensibles y el repositorio es público.
- **Terraform Cloud u otro servicio externo:** válido, pero añade una cuenta y una dependencia
  externa para un proyecto que ya usa GCP.
- **Crear el bucket con el propio Terraform:** descartada por el problema del huevo y la
  gallina; habría que gestionar un estado inicial local de todos modos.

## Consecuencias

- Cualquier persona con permisos sobre el bucket puede aplicar, y el historial de versiones
  permite recuperar un estado anterior.
- El coste es de céntimos o cero: el estado pesa unas decenas de KB.
- El bucket no está bajo Terraform; su creación se documenta en `docs/gcp-setup.md`.
- El nombre del bucket está escrito en `main.tf`; en otro proyecto hay que cambiarlo.
- Quien aplique necesita credenciales de GCP con acceso al bucket.
