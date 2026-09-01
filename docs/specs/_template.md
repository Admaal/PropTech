---
id: "<feature-id>"
status: draft
confirmed: false
---

# Spec: <nombre de la feature o cambio>

> `confirmed` permanece en `false` hasta que el usuario apruebe esta spec concreta
> en el chat. Solo se cambia a `true` en un turno posterior a ese «sí».

## Contexto y problema

Describe qué problema existe, quién lo sufre y por qué se hace este cambio.

## Resultado deseado

Describe el comportamiento observable que debe existir al terminar.

## Historia de usuario

Como **<rol>**, quiero **<acción>**, para **<resultado>**.

## Alcance

- Incluido:
- Incluido:

## Criterios de aceptación (EARS)

Cada criterio expresa una sola afirmación comprobable y se identifica para poder
trazarlo al plan y a los tests.

- [ ] **AC-01:** WHEN <evento> THE system SHALL <respuesta observable>.
- [ ] **AC-02:** WHILE <estado> THE system SHALL <comportamiento>.
- [ ] **AC-03:** IF <condición no deseada> THEN THE system SHALL <respuesta>.
- [ ] **AC-04:** WHERE <opción activa> THE system SHALL <comportamiento opcional>.
- [ ] **AC-05:** THE system SHALL <regla que siempre se cumple>.

## Casos límite y errores

- <entrada inválida o ausente> → <respuesta esperada>
- <reintento, doble envío o reconexión> → <respuesta esperada>
- <fallo de dependencia> → <respuesta esperada>

## Fuera de alcance

- <comportamiento que no se implementará en este cambio>
- <integración, rol o variante que queda para otra fase>

## Riesgos nuevos de esta fase

Completa todas las preguntas. Un «no» también se deja escrito. Por cada «sí», propone
el test, el gate (`afterFileEdit`, `stop` o `CI`) y espera confirmación del usuario antes
de implementar esa mitigación junto con la feature.

- **¿Toca datos personales de alguien que no sea el propio usuario?** <Sí/No>.
  Test de aislamiento con dos identidades: <propuesta o no aplica>. Gate: <gate>.
- **¿Escribe algo que pueda repetirse por reintento, reconexión o doble tap?** <Sí/No>.
  Test de idempotencia/no duplicación: <propuesta o no aplica>. Gate: <gate>.
- **¿Introduce un rol o permiso nuevo?** <Sí/No>. Test de lo que ese rol no puede
  hacer: <propuesta o no aplica>. Gate: <gate>.
- **¿Toca dinero, cupos o algo limitado?** <Sí/No>. Validación en servidor y test de
  límite/carrera: <propuesta o no aplica>. Gate: <gate>.
- **¿Acepta contenido que vaya a ver otra persona?** <Sí/No>. Saneado/moderación y
  test: <propuesta o no aplica>. Gate: <gate>.
- **¿Cambia el esquema de datos de algo que ya tiene usuarios reales?** <Sí/No>.
  Migración reversible y test de upgrade/downgrade: <propuesta o no aplica>. Gate: <gate>.
- **¿Añade un secreto o credencial nueva?** <Sí/No>. Comprobación de que no llega al
  cliente ni al repo: <propuesta o no aplica>. Gate: <gate>.
- **¿Añade tests, un gate nuevo o más trabajo a uno existente?** <Sí/No>. Medición y
  ajuste de presupuesto/timeout: <propuesta o no aplica>. Gate: <gate>.

## Trazabilidad

- Plan: <ruta al plan aprobado>
- Tests por criterio: <ruta o lista de tests>
- Evidencia adicional (navegador, contrato, migración): <ruta o no aplica>
