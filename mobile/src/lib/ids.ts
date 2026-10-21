let counter = 0;

/** Unique, increasing numeric id (safe integer: ms timestamp * 1000 + counter). */
export const newId = () => Date.now() * 1000 + (counter++ % 1000);
