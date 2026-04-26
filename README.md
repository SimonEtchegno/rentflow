# RentFlow - Panel de Gastos Personales 🇦🇷

Una aplicación web completa, simple y funcional para gestionar y pagar tus gastos mensuales (alquiler, expensas, servicios) integrada con Mercado Pago.

## Características

- 📊 **Panel Mensual:** Resumen de tus gastos filtrados por mes.
- 🎨 **Estados visuales:** Verde para "Pagado", Rojo para "Pendiente".
- 💳 **Pagos con Mercado Pago:** Integración con la API Checkout Pro de Mercado Pago.
- ✏️ **Gestión:** Agrega, edita (monto en línea) y elimina gastos manualmente.
- 🔄 **Duplicar:** Copia automáticamente los gastos del mes anterior al mes actual.
- 💾 **Base de datos local:** Todo se guarda en un archivo `data.json` local (ideal para uso personal sin configuraciones complejas).

## Instrucciones de instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar Mercado Pago:**
   - Crea un archivo `.env` en la raíz del proyecto.
   - Agrega tu Access Token de Mercado Pago:
     ```env
     MP_ACCESS_TOKEN=tu_access_token_de_prueba_o_produccion
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```
   - *Nota:* Si no configuras el token, la aplicación funcionará en "Modo Simulación" permitiéndote ver cómo sería el flujo visual del pago.

3. **Ejecutar el proyecto:**
   ```bash
   npm run dev
   ```

4. Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## Webhooks (Avanzado)
Para que Mercado Pago actualice automáticamente el estado a "Pagado" cuando completas el pago real, necesitas exponer tu puerto 3000 a internet (por ejemplo usando ngrok):
```bash
ngrok http 3000
```
Y luego actualizar la variable `NEXT_PUBLIC_APP_URL` en tu `.env` con la URL de ngrok. La aplicación enviará a Mercado Pago la URL `${NEXT_PUBLIC_APP_URL}/api/webhook` para las notificaciones.
