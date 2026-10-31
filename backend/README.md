# Learn App API

## Start locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Create the MySQL database once if it does not exist:

```sql
CREATE DATABASE my_appLearn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Add the Aliyun credentials to `.env` before using SMS verification. Copy the keys in `.env.example`; never commit the real credential file. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

## Rotate Aliyun access keys

Treat the Aliyun AccessKey Secret as a password. Do not put it in source code, the frontend, screenshots, or chat messages. It belongs only in the ignored `backend/.env` file.

1. In the Aliyun console, create a new AccessKey for the same RAM identity used by this app. Use a least-privilege RAM user rather than an account-level key where possible.
2. Replace `ALIYUN_ACCESS_KEY_ID` and `ALIYUN_ACCESS_KEY_SECRET` in `backend/.env` with the new pair. Do not share the new secret outside that file.
3. Restart the backend and send one test SMS to confirm the new pair works.
4. Disable and delete the old AccessKey in the Aliyun console as soon as the test succeeds.

The old key that was previously exposed should be considered compromised and must not be re-enabled.

## Database migrations and tests

Alembic owns the database schema. For a new database, run `alembic upgrade head` before starting the API. This project already had a live schema before migrations were introduced, so an existing database with the current `users` and `study_data` tables must be marked once without changing its data:

```bash
alembic stamp head
```

Create a migration after each model change with `alembic revision --autogenerate -m "describe change"`, review the generated file, then run `alembic upgrade head`.

Run the isolated API and migration regression tests with:

```bash
pytest
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/send-sms` | Send a six-digit verification code for `register`, `login`, or `reset_password` |
| POST | `/api/v1/auth/register` | Verify an SMS code, register, and return a JWT |
| POST | `/api/v1/auth/login` | Log in and return a JWT |
| POST | `/api/v1/auth/login-by-sms` | Verify an SMS code and log in by phone |
| POST | `/api/v1/auth/forgot-password` | Verify an SMS code and reset a password by registered phone |
| GET | `/api/v1/auth/me` | Get the current user with a Bearer JWT |
| PUT | `/api/v1/auth/me/avatar` | Upload the current user's JPG, PNG, or WebP avatar, up to 5MB |
| DELETE | `/api/v1/auth/me/avatar` | Remove the current user's custom avatar |
| GET | `/api/v1/study-data` | Get the current user's task, card, and check-in data |
| PUT | `/api/v1/study-data` | Replace the current user's task, card, and check-in data |

## Physical-device H5 test

1. Connect the phone and development computer to the same Wi-Fi network.
2. Start the backend with `--host 0.0.0.0`, so the phone can reach it.
3. Find the computer's current LAN IP, then confirm `http://<LAN-IP>:8000/health` opens from the phone.
4. Open `http://<LAN-IP>:5174/#/` on the phone. The H5 frontend automatically sends requests to that same LAN IP.
5. In the frontend source, set `NATIVE_API_HOST` in `frontend/api/request.js` to the computer's LAN IP before using a native App build. Update it whenever the computer joins a different network.

For a real phone, `127.0.0.1` points to the phone itself, not the development computer.
