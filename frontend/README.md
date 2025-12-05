This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Feature note: On the Profile page, you can upload a medical report. If the backend and the ML microservice are running and configured (see `backend/README.md` and `ml-services/README.md`), the backend will process the report and the UI will display an AI-generated summary and diet plan. You can also re-run processing via the 'Process' button next to the uploaded report.

New pages:

- `/nutrition` — Food Recognition & Nutrition: upload an image, view recognition results, nutrition breakdown, cultural diet recommendations, and meal analysis.
- `/preventive-assistant` — Preventive Health Assistant: enter a basic health profile to receive early warning alerts, preventive suggestions, and personalized daily tasks (server APIs required to be implemented).

UI improvements added:
- Health Risk Forecast Page (`/dashboard/risk`): improved trajectory line-chart, a radial gauge for the current risk score, an AI prediction summary, a Time Machine slider to play month-by-month changes, and a What-If simulator to compare scenarios (weight change/activity changes).
- Adaptive Workout Page (`/dashboard/workout`): enhanced plan layout with a Workout Progress Chart, AI-adapt toggle to adjust the plan based on completion, and improved progress tracking in the sidebar.
- Nutrition Page (`/dashboard/nutrition`): donut chart macro breakdown, improved meal analysis cards, cultural diet tips, and recent recognitions list.

Notes:
- If the ML endpoints (`/api/food/recognize` and `/api/assistant/check-warnings`) are not implemented, the Nutrition page includes a **Use mock result** button so you can preview the UI locally.
- To enable the full experience, start the ML services and backend as described in the repository README.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

New Chat Features:
- The "Chat with AI" quick action modal now displays follow-up questions when the assistant needs more profile data.
- Any urgent lab values (if lab reference ranges in uploaded reports indicate out-of-range values) are surfaced as a clear alert with a recommendation to consult a medical professional.
- Parsed report facts and evidence snippets can be viewed via a 'View report details' toggle inside the Chat modal for better transparency.
 - The dashboard includes a new "Explain HealthSphere" quick action button which opens the AI chat and auto-sends a short explanation of the platform's purpose, features, target users, and limitations.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
