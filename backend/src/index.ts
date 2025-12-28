import app from "./app";
import { runMigrations } from "./libs/utils/runMigrations";

const PORT = process.env.PORT || 4000;

(async () => {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

export default app;
