# Finance V1 — PRD Inicial / Requisitos

## 1. Propósito

Finance V1 convierte la app existente `meshflow-app-expenses`, usada como smoke test de lifecycle, en el primer slice de producto Finance para MeshFlow.

La app permitirá gestionar registros de finanzas personales para usuarios autenticados de MeshFlow, persistiendo datos de Finance mediante collections de Core Storage API y usando Core App Jobs Scheduler para procesar transacciones vencidas.

---

## 2. Objetivos de producto

- Proveer un ledger financiero V1 confiable para ingresos y gastos.
- Modelar cuentas, categorías, transacciones, transacciones recurrentes y transacciones programadas como recursos principales.
- Soportar automatización de lifecycle para suscripciones, salarios, ingresos recurrentes y movimientos únicos futuros.
- Exponer endpoints de analytics enfocados en lugar de un único endpoint gigante de reportes.
- Integrarse con Core Gateway, Core Storage API y Core App Jobs Scheduler sin introducir una base de datos propia de la app.

---

## 3. No objetivos / roadmap futuro

| Área | Posición V1 |
|---|---|
| OCR de recibos | Alcance futuro. En V1 los registros son datos estructurados provistos por usuario/API. |
| Presupuestos | Alcance futuro. Analytics V1 puede alimentar features posteriores de presupuesto. |
| Conversión multi-moneda | Alcance futuro. V1 guarda moneda de transacción/cuenta, pero no convierte automáticamente. |
| Metas de ahorro | Alcance futuro. V1 no incluye seguimiento de metas. |
| Alertas inteligentes | Alcance futuro. V1 puede exponer datos necesarios para alertas posteriores. |
| Hardening/firma para acceso público directo | Alcance futuro. V1 confía en headers del Core Gateway y documenta el riesgo de acceso directo. |

---

## 4. Usuarios y contexto

| Usuario | Contexto | Necesidad |
|---|---|---|
| Usuario MeshFlow | Accede a Finance a través de Core Gateway | Gestionar cuentas, ingresos, gastos y próximos movimientos. |
| Operador de Finance | Despliega el servicio remoto | Mantener el servicio stateless y persistido mediante Core Storage. |
| Core Scheduler | Llama al endpoint de jobs de la app cuando está habilitado | Procesar transacciones recurrentes/programadas vencidas de forma idempotente. |

---

## 5. Requisitos

| ID | Requisito | Prioridad | Señal de aceptación |
|---|---|---|---|
| FIN-AUTH-001 | Finance MUST confiar en `x-meshflow-user-id` enviado por Core Gateway como identidad autenticada del usuario. | Must | Requests sin identidad de usuario confiable son rechazadas. |
| FIN-AUTH-002 | Finance MUST aislar todos los recursos pertenecientes a usuario por el ID de usuario confiable. | Must | El Usuario A no puede listar, leer, actualizar, borrar ni procesar recursos del Usuario B. |
| FIN-ACC-001 | Los usuarios MUST poder crear, leer, actualizar, listar y soft-delete cuentas. | Must | Los endpoints CRUD de cuentas operan solo sobre cuentas del caller. |
| FIN-ACC-002 | Las cuentas MUST incluir moneda, con default `EUR` cuando se omite. | Must | Las cuentas creadas tienen moneda; si se omite, queda `EUR`. |
| FIN-CAT-001 | Los usuarios MUST gestionar categorías como entidades. | Must | Existen endpoints CRUD de categorías y están aislados por usuario. |
| FIN-CAT-002 | El tipo de categoría MUST ser `income` o `expense`; `both` MUST NOT aceptarse. | Must | Un tipo de categoría inválido es rechazado. |
| FIN-TXN-001 | Finance MUST usar un único modelo de transacciones para ingresos y gastos. | Must | Las transacciones representan ambas direcciones mediante `type: income | expense`. |
| FIN-TXN-002 | Las transacciones MUST incluir moneda desde V1. | Must | Toda transacción persiste un valor de moneda. |
| FIN-TXN-003 | Las transacciones SHOULD soportar filtros por rango de fechas, cuenta, categoría, tipo y estado/borrado. | Should | El endpoint de listado puede acotar resultados con los filtros soportados. |
| FIN-REC-001 | Las transacciones recurrentes MUST cubrir suscripciones y salarios/ingresos recurrentes. | Must | Las definiciones recurrentes soportan `income` y `expense`. |
| FIN-REC-002 | Las transacciones recurrentes MUST generar transacciones de ledger mediante procesamiento idempotente. | Must | Re-ejecutar la misma ocurrencia no duplica una transacción. |
| FIN-SCH-001 | Las transacciones programadas MUST cubrir ingresos y gastos únicos futuros. | Must | Se pueden crear registros únicos futuros y procesarlos más adelante. |
| FIN-SCH-002 | Las transacciones programadas MUST procesarse como transacciones de ledger de forma idempotente. | Must | Re-procesar el mismo ítem programado no duplica una transacción. |
| FIN-DUE-001 | Finance MUST exponer `/internal/jobs/process-due` para Core Scheduler. | Must | Core Scheduler puede invocar el procesamiento de vencidos. |
| FIN-DUE-002 | `process-due` MUST procesar transacciones recurrentes y programadas vencidas de forma idempotente. | Must | Ejecuciones duplicadas, sean del scheduler o manuales, son seguras. |
| FIN-ANA-001 | Analytics MUST dividirse en múltiples endpoints enfocados. | Must | V1 no requiere un único endpoint gigante de analytics. |
| FIN-ANA-002 | Analytics SHOULD incluir vistas de cashflow, categoría, cuenta, timeline, mayores gastos/ingresos, próximos movimientos, impacto recurrente y forecast. | Should | El contrato de endpoints documenta cada vista. |
| FIN-STO-001 | Finance V1 MUST NOT usar base de datos propia. | Must | La app persiste únicamente mediante collections de Core Storage API. |
| FIN-STO-002 | Finance MUST declarar las collections requeridas en su manifest de MeshFlow. | Must | El manifest incluye accounts, categories, transactions, recurring-transactions, scheduled-transactions. |
| FIN-SEC-001 | Finance MUST documentar el riesgo de acceso público directo porque V1 asume confianza en headers de Gateway. | Must | El diseño técnico registra este riesgo y el camino de hardening futuro. |
| FIN-CI-001 | La planificación MUST definir batches de implementación y comandos de test/verificación. | Must | El plan de batches mapea requisitos a tests y comandos. |

---

## 6. Criterios de aceptación

- La planificación V1 define requisitos de producto, diseño técnico y plan de batches/tests antes de iniciar implementación runtime.
- Finance V1 no requiere base de datos propia de la app y toda la persistencia de dominio está mapeada a collections de Core Storage API.
- El modelo de transacciones soporta explícitamente `income` y `expense`, e incluye moneda.
- Las categorías rechazan explícitamente `both` como tipo.
- Las cuentas incluyen moneda con default `EUR`.
- Los requisitos de procesamiento recurrente y programado especifican idempotencia ante invocaciones repetidas.
- Analytics se planifica como múltiples endpoints con responsabilidades claras.
- El estado actual v0.1 de lifecycle smoke test permanece documentado por separado de la planificación V1.

---

## 7. Decisiones abiertas

| Decisión | Opciones | Notas |
|---|---|---|
| Representación de importes | Entero en unidades menores vs string decimal | Preferir representación exacta; cerrar antes de implementar. |
| Semántica de timezone | Due dates solo UTC vs schedule local del usuario interpretado a UTC | Los jobs diarios de Core son UTC; falta confirmar expectativas UX. |
| Estrategia de balance de cuenta | Derivado de transacciones vs snapshots cacheados de balance | Derivado es más simple; snapshots pueden hacer falta más adelante por performance. |
| Forma de queries en Storage API | Filtros directos por collection vs lectura/filtrado a nivel app | Depende de las capacidades de Core Storage API disponibles para Finance. |
| Endpoints manuales process-one | Mantener solo internos vs exponer retry iniciado por usuario | El diseño incluye “maybe”; cerrar durante implementación API. |
| Restore de soft-delete | Solo borrar vs soportar restore | V1 requiere soft delete conceptual; restore puede diferirse. |
