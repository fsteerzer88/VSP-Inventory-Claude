import { app } from "./app";
import { env } from "./config/env";
import { ensureImagesDir } from "./services/image-storage.service";

ensureImagesDir();

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
