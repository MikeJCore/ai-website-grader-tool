# Web Performance Audit Tool

A modern web application for auditing website performance, accessibility, and best practices using Lighthouse and Next.js.

![Web Performance Audit Tool Screenshot](./public/screenshot.png)

## Features

- **AI-Powered Insights**: Get intelligent analysis and recommendations based on audit results
- **Performance Analysis**: Get detailed performance metrics using Lighthouse
- **Accessibility Audits**: Check WCAG 2.1 AA + EAA compliance
- **Trust & Security**: Verify security and privacy metrics
- **Agent Readiness**: Analyze structured data and metadata
- **Responsive Design**: Works on all device sizes
- **Dark/Light Mode**: Built-in theme support

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **AI Integration**: OpenAI GPT-4 for intelligent insights
- **Auditing**: Lighthouse
- **Type Safety**: TypeScript
- **Deployment**: Netlify (with Edge Functions support)

## Prerequisites

- Node.js 18.0.0 or later
- npm or yarn
- Chrome/Chromium (for local development)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/web-audit-tool.git
cd web-audit-tool
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Copy the example environment file and update with your OpenAI API key:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your OpenAI API key:

```env
# For development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Add your OpenAI API key for AI-powered insights
# OPENAI_API_KEY=your_openai_api_key
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a website URL in the input field (e.g., `https://example.com`)
2. Click "Run Audit" to start the analysis
3. View the detailed results including:
   - Overall performance score
   - Individual pillar scores (Accessibility, Trust, Performance, Agent Readiness)
   - Key insights and recommendations
   - Detailed metrics and suggestions for improvement

## Deployment

### Netlify

This project is configured for deployment on Netlify with Edge Functions:

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Set the build command: `npm run build` or `yarn build`
4. Set the publish directory: `.next`
5. Add environment variables in the Netlify dashboard

### Vercel

You can also deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fweb-audit-tool)

## Development

### Available Scripts

- `dev`: Start development server
- `build`: Create production build
- `start`: Start production server
- `lint`: Run ESLint
- `format`: Format code with Prettier

### Directory Structure

```
src/
  ├── app/               # App Router pages and layouts
  ├── components/        # Reusable UI components
  ├── hooks/             # Custom React hooks
  ├── lib/               # Utility functions
  ├── services/          # API services
  └── types/             # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- [Lighthouse](https://github.com/GoogleChrome/lighthouse) for the auditing engine
- [Next.js](https://nextjs.org/) for the React framework
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Tailwind CSS](https://tailwindcss.com/) for styling
