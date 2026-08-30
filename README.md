# Jeni's Lashes & Brows — Frontend

Frontend for a commercial landing and administration platform for a beauty professional.

## What it delivers

- Public landing page with services, gallery, testimonials and contact flows.
- Admin screens for appointments, clients, services, schedules, content and finance.
- Responsive layouts for desktop and mobile.
- Typed API client for authentication, CMS content, appointments and financial summaries.
- Appointment overlap validation, status management and local demo data for rapid UI iteration.
- Integration boundary prepared for the companion Spring Boot backend.

The appointment and finance demo views use browser-persisted mock data so the interface can be evaluated without a running backend. Production data access is isolated in src/lib/api.

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- GSAP and Framer Motion
- Recharts and Embla Carousel
- Radix-based UI components
- Vercel Analytics

## Running locally

~~~bash
npm ci
npm run dev
~~~

The application is available at http://localhost:3000.

To connect the frontend to the Java backend, set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL in .env.local. Without it, the public pages and demo admin flows remain available.

## Verification

~~~bash
npm run build
npm run lint
~~~

The project includes a flat ESLint configuration and TypeScript validation during the production build.
