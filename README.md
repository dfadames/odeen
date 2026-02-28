# Odeen

Sistema de votación seguro, anónimo y auto-hospedado para la logística de asambleas universitarias.


## Propósito

Odeen nace como una solución técnica a la necesidad de legitimidad en los procesos democráticos universitarios. No es solo una herramienta de votación, sino un protocolo de confianza digital diseñado bajo dos pilares innegociables:

### 1. Rigor y Legitimidad en la Participación

Garantizamos que cada proceso refleje fielmente la voluntad de la asamblea mediante la verificación estricta de criterios de acceso.

* **Validación Identitaria:** Integración con sistemas institucionales (como el correo `@unal.edu.co`) para asegurar que solo miembros autorizados participen.
* **Control de Contexto:** Capacidad de restringir votaciones según la ubicación geográfica o la modalidad (presencial, remota o híbrida), asegurando que el quórum cumpla con las reglas del espacio deliberativo.

### 2. Privacidad Blindada y Transparencia Radical

Entendemos que el anonimato es la piedra angular de la libre expresión. Por ello, Odeen separa la identidad del votante de su intención de voto.

* **Anonimato Técnico:** Implementamos mecanismos que aseguran que, una vez validada la identidad, el voto se vuelva completamente rastreable pero imposible de vincular al usuario.
* **Auditoría Abierta:** Al ser una plataforma de código abierto y auto-hospedada (*self-hosted*), garantizamos transparencia total. Cualquier integrante de la comunidad puede auditar el código, verificar su funcionamiento y asegurar que no existan "cajas negras" en el procesamiento de los datos.

## Origen del nombre

En la novela "Los propios dioses" de Isaac Asimov, se plantea la existencia de una raza de seres individuales que se agrupan en triadas: el Racional Odeen, la Emocional Dua y el Paternal Tritt. El proyecto asume la identidad del integrante racional para enfatizar su función como herramienta de análisis y orden lógico.
Odeen surge como una plataforma diseñada para apelar a lo racional, a lo discreto y a lo cuantificable. Su propósito es intervenir en aquellos momentos donde la complejidad logística de una asamblea dificulta definir con precisión lo numérico de las cosas, brindando una base técnica de certeza que traduzca la voluntad colectiva en datos íntegros y verificables.

## Stack Tecnológico

* **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
* **Backend**: Go + Gin
* **Base de datos**: PostgreSQL 16
* **Despliegue**: Docker Compose + Túneles de Cloudflare

## Configuración Local

```bash
git clone https://github.com/dfadames/odeen.git
cd odeen
docker compose up --build

```

* **Frontend**: http://localhost:3000
* **Estado del Backend (Health)**: http://localhost:8080/health
* **Base de datos**: localhost:5432

## Despliegue

Exponlo mediante [Túneles de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/); no se requieren puertos de entrada abiertos.

```bash
cloudflared tunnel login
cloudflared tunnel create odeen
cloudflared tunnel run odeen

```

## Contribuciones

Consulta [CONTRIBUTING.md](https://www.google.com/search?q=./CONTRIBUTING.md).

## Licencia

[MIT](https://www.google.com/search?q=./LICENSE)
