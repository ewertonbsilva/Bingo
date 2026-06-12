import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const cwd = process.cwd();
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const fullPath = path.join(cwd, file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}
