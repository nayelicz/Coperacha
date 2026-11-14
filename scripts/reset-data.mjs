// Borra /data/coperachas.json para empezar de cero (se vuelve a crear con la historia de Trini).
import { rmSync } from "fs";
rmSync(new URL("../data/coperachas.json", import.meta.url), { force: true });
console.log("Datos reiniciados. La historia destacada se crea al abrir la app.");
