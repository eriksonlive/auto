// src/core/env.js
import "dotenv/config";

export function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} en .env`);
  return v;
}