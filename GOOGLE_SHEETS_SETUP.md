# Configurar Google Sheets

Esta app ya puede enviar cada operación a una pestaña específica de un documento compartido de Google Sheets.

## 1. Crea el Apps Script

1. Abre tu documento de Google Sheets.
2. Ve a `Extensiones > Apps Script`.
3. Reemplaza el contenido del archivo por este script:

```javascript
const SPREADSHEET_ID = "PEGA_AQUI_EL_ID_DE_TU_SHEET";
const ALLOWED_TABS = [
  "Operaciones",
  "Caja",
  "Historial"
];

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const payload = JSON.parse(e.postData.contents || "{}");
    const sheetName = String(payload.sheetName || "").trim();
    const rowData = Array.isArray(payload.rowData) ? payload.rowData : [];

    if (!sheetName) {
      return jsonResponse({ ok: false, message: "Falta sheetName." });
    }

    if (!ALLOWED_TABS.includes(sheetName)) {
      return jsonResponse({ ok: false, message: "La pestaña no está permitida." });
    }

    if (!rowData.length) {
      return jsonResponse({ ok: false, message: "Falta rowData." });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ ok: false, message: "La pestaña no existe en el documento." });
    }

    sheet.appendRow(rowData);

    return jsonResponse({
      ok: true,
      message: "Fila agregada correctamente.",
      sheetName,
      rowLength: rowData.length
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error.message || "Error interno en Apps Script."
    });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 2. Saca el `Spreadsheet ID`

El `Spreadsheet ID` es la parte de la URL entre `/d/` y `/edit`.

Ejemplo:

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit#gid=0
```

En ese caso, el ID es:

```text
1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

## 3. Ajusta las pestañas permitidas

En el script cambia `ALLOWED_TABS` por los nombres exactos de las pestañas que quieres habilitar.

Después, en el frontend, cambia el bloque `SHEET_CONFIG` de [c:\Users\diego.rojas\Desktop\Cambios\index.html](c:\Users\diego.rojas\Desktop\Cambios\index.html) para que tenga los mismos nombres:

```javascript
const SHEET_CONFIG = {
  appsScriptUrl: "PEGA_AQUI_LA_URL_DEL_WEB_APP",
  allowedTabs: [
    "Operaciones",
    "Caja",
    "Historial"
  ]
};
```

Los nombres deben coincidir exactamente entre el script y el frontend.

## 4. Publica el script como Web App

1. En Apps Script, haz clic en `Implementar > Nueva implementación`.
2. Elige `Aplicación web`.
3. En `Ejecutar como`, usa tu cuenta.
4. En `Quién tiene acceso`, selecciona `Cualquier persona con el enlace`.
5. Implementa y autoriza el acceso.
6. Copia la URL de la Web App.

## 5. Pega la URL en el frontend

Abre [c:\Users\diego.rojas\Desktop\Cambios\index.html](c:\Users\diego.rojas\Desktop\Cambios\index.html) y reemplaza:

```javascript
appsScriptUrl: "",
```

por algo así:

```javascript
appsScriptUrl: "https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec",
```

## 6. Cómo funciona el envío

Cuando pulses `Guardar en Google Sheets`, el frontend enviará este payload:

```json
{
  "sheetName": "Operaciones",
  "headers": ["Fecha", "Plataforma", "Tipo Operación"],
  "rowData": ["08/04/2026", "Binance", "Compra USDT"],
  "submittedAt": "2026-04-08T20:00:00.000Z"
}
```

El script usa `sheetName` y `rowData`. Los demás campos son informativos.

## 7. Recomendación de prueba

Antes de usar pestañas productivas compartidas:

1. Crea una pestaña de prueba dentro del mismo documento.
2. Ponla en `ALLOWED_TABS`.
3. Selecciónala desde el formulario.
4. Guarda una operación de prueba.
5. Confirma que la fila aparece al final y en el orden correcto.

## 8. Si algo falla

- Si el botón muestra error, revisa que la URL del Web App sea la correcta.
- Si no se inserta la fila, verifica que la pestaña exista y que el nombre coincida exactamente.
- Si cambias los nombres de pestañas en Google Sheets, actualiza también `SHEET_CONFIG` en el frontend.
- Si publicas una nueva versión del script, asegúrate de usar la URL activa de esa implementación.
