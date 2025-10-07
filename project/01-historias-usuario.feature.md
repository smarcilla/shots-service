#language: es
Feature: Consumir disparos por id y ejecutar simulación
Como API de simulación
Quiero descargar el JSON del partido por id desde Supabase y ejecutar la simulación
Para devolver un resumen con distribución de marcadores y probabilidades

Background:
Given existe una entrada en "matches_index" que mapea el id de partido al path del JSON en Storage
And el servicio dispone de credenciales de servicio para leer el bucket privado

Scenario: Simulación por id existente
Given el id "atl-mad-20240928" existe en el índice y el JSON es válido
When llamo a POST /simulate/by-id con body { "id": "atl-mad-20240928", "runs": 1000 }
Then el servicio descarga el JSON, valida y parsea los disparos
And ejecuta la simulación Monte Carlo
And responde 200 con { "id", "runs", "summary", "scoreDistribution", "pctRealScore" }

Scenario: Id inexistente
Given el id "foo-123" no existe en el índice
When llamo a POST /simulate/by-id con body { "id": "foo-123" }
Then recibo 404 con un mensaje indicando que el id no está indexado

Scenario: JSON malformado
Given el id "atl-mad-20240928" existe pero el JSON en Storage está corrupto
When llamo a POST /simulate/by-id
Then recibo 422 con detalles mínimos del error de validación

Feature: Obtener URL firmada temporal para depurar
Como desarrollador
Quiero solicitar una URL firmada de corta duración al JSON del partido
Para inspeccionarlo puntualmente desde el navegador

Scenario: Solicitud de URL firmada válida
Given el id "atl-mad-20240928" existe en el índice
When llamo a GET /matches/atl-mad-20240928/url?s=60
Then recibo 200 con { "url": "<https://...>", "expiresIn": 60 }

Scenario: Parámetros inválidos
When llamo a GET /matches/atl-mad-20240928/url?s=5
Then recibo 400 indicando que el mínimo permitido es 10 segundos
