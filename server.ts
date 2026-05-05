import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRoutes from './api/index.js'; // Ensure correct path mapping/resolution if Node module, but since we use tsx, index.ts is fine. Wait, let's just use './api/index.ts' or import without extension. Actually tsx resolves './api/index.ts' if we do './api/index.js' but let's do './api/index.js' which is standard in module systems. Wait, tsx resolves both.

const app = express();
const PORT = 3000;

app.use(apiRoutes);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
