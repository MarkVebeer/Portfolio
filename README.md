# Portfolio

## Overview

This repository contains the source code for a personal portfolio website built using modern web technologies. The project is designed to showcase projects, skills, and experiences in a clean and responsive manner.

## Features

- **Responsive Design**: Ensures optimal viewing experience across various devices.
- **Modern Technologies**: Built with [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), and TypeScript for efficient development and performance.
- **Component-Based Architecture**: Utilizes a modular structure for easy maintenance and scalability.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/) package manager

### Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/nrbrtuwu/Portfolio.git
   cd Portfolio
   ```

2. **Install Dependencies**:

   Using npm:

   ```bash
   npm install
   ```

   Or using Yarn:

   ```bash
   yarn install
   ```

### Running the Development Server

To start the development server:

```bash
npm run dev
```

Or with Yarn:

```bash
yarn dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

To build the project for production:

```bash
npm run build
```

Or with Yarn:

```bash
yarn build
```

The optimized files will be in the `dist` directory.

## Project Structure

```
Portfolio/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── styles/
│   └── main.tsx
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

- **`src/`**: Contains the source code.
  - **`assets/`**: Images and other static assets.
  - **`components/`**: Reusable React components.
  - **`pages/`**: Page components representing different routes.
  - **`styles/`**: Global and component-specific styles.
  - **`main.tsx`**: Entry point of the application.
- **`index.html`**: Main HTML file.
- **`package.json`**: Project metadata and scripts.
- **`tailwind.config.js`**: Tailwind CSS configuration.
- **`tsconfig.json`**: TypeScript configuration.
- **`vite.config.ts`**: Vite configuration.

## Customization

To personalize the portfolio:

1. **Update Content**: Modify the content in the `src/pages` and `src/components` directories to reflect your information.
2. **Change Styles**: Adjust the styles in `src/styles` and update the Tailwind configuration as needed.
3. **Add Projects**: Include your projects in the appropriate components or pages.

## Deployment

After building the project, you can deploy the contents of the `dist` directory to any static hosting service, such as [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/), or [GitHub Pages](https://pages.github.com/).

## License

This project is licensed under the [MIT License](LICENSE).

---
