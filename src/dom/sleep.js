// src/dom/sleep.js
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));