# SmartGrid Campus

SmartGrid Campus is a dashboard for monitoring energy sources, battery health, grid status, weather predictions, and decision rules for campus power coordination.

## What You Need

Before running the app on another laptop, install these first:

1. **Node.js** 20 or newer.
2. **pnpm** package manager.
3. **MySQL database** if you want the full app to work with data storage.
4. **WeatherAPI key** for weather and prediction screens.
5. Other app secrets already stored in `.env`.

## Project Files To Keep

Make sure you copy the full project folder, including:

- `client/`
- `server/`
- `shared/`
- `drizzle/`
- `package.json`
- `pnpm-lock.yaml`
- `.env`

Do not delete the `.env` file. It contains the required environment values.

## Environment Variables

Create a `.env` file in the project root if it does not already exist.

```

Notes:
- `WEATHERAPI_KEY` or `VITE_WEATHERAPI_KEY` can be used for weather features.
- If you already have a working `.env`, just copy that same file to the new laptop.
- Keep the values private.

## Step-by-Step Setup

### 1. Open the project folder

Open a terminal in the project root folder, for example:

```powershell
cd "E:\Smart Grid"
```

### 2. Install dependencies

Run:

```powershell
pnpm install
```

This downloads all frontend and backend packages.

### 3. Check the `.env` file

Make sure the root `.env` file exists and has the required keys listed above.

If the app starts but weather, login, or database features fail, the problem is usually a missing or wrong `.env` value.

### 4. Prepare the database

If you are using MySQL, make sure the database is running and `DATABASE_URL` is correct.

Then push the database schema:

```powershell
pnpm db:push
```

If this command fails, check:
- MySQL server is running
- `DATABASE_URL` is valid
- the database name exists

### 5. Start the app in development mode

On Windows, run:

```powershell
pnpm run dev:ps
```

If you are on another system, you can also use:

```bash
pnpm run dev
```

### 6. Open the app in the browser

After the server starts, open:

```text
http://localhost:3000
```

## Build and Production Run

If you want to test the production build:

```powershell
pnpm run build
```

Then start the built app:

```powershell
pnpm start
```

## Useful Commands

```powershell
pnpm run dev:ps   # Start development server on Windows
pnpm run build    # Build frontend and backend for production
pnpm start        # Run the production build
pnpm run check    # TypeScript type check
pnpm run test     # Run tests
pnpm db:push      # Generate and migrate database schema
```

## What Each Main Page Does

- **Overview**: live energy summary and quick action card.
- **Energy Sources**: solar and wind adjustments.
- **Battery Management**: battery capacity, health, and SOC controls.
- **Grid Coordination**: grid status and usage cost control.
- **Decision Engine**: decision rules and generate button.
- **Predictions**: weather-based prediction and strategy page.
- **Reports**: CSV export with weather prediction data.

## Common Problems

### App does not start
- Check that Node.js and pnpm are installed.
- Run `pnpm install` again.
- Make sure you are inside the project root folder.

### Weather pages are empty
- Check `WEATHERAPI_KEY` or `VITE_WEATHERAPI_KEY` in `.env`.
- Make sure internet access is available.

### Login or auth errors
- Check `JWT_SECRET`, `OAUTH_SERVER_URL`, `OAUTH_CLIENT_SECRET`, and `OWNER_OPEN_ID`.

### Database errors
- Check `DATABASE_URL`.
- Make sure MySQL is running.
- Run `pnpm db:push` after the database is ready.

## Recommended Run Order on a New Laptop

1. Install Node.js.
2. Install pnpm.
3. Copy the project folder.
4. Add the `.env` file.
5. Run `pnpm install`.
6. Run `pnpm db:push`.
7. Run `pnpm run dev:ps`.
8. Open `http://localhost:3000`.

## Notes

- Use `pnpm` because this project is set up for it.
- Keep `.env` private.
- If you move the project to another laptop, copy the `.env` file exactly.
