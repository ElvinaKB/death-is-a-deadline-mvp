import { exec } from "child_process";

export async function runMigrations() {
  return new Promise<void>((resolve, reject) => {
    exec("npx prisma migrate deploy", (error, stdout, stderr) => {
      if (error) {
        console.error("Migration error:", stderr);
        reject(error);
      } else {
        console.log("Migrations applied:", stdout);
        resolve();
      }
    });
  });
}
