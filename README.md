# goBook (Frontend + Backend)

Du an gom:
- Frontend: React + Vite (thu muc goc)
- Backend: Node.js + Express + SQLite (thu muc `backend/`)

Muc tieu deploy:
- Backend chay tren Railway
- Frontend chay tren Vercel

## 1) Day code len GitHub

Remote ban muon dung:
- `https://github.com/TienDatzd99/goBook.git`

Neu may ban CHUA co repo git:

```bash
cd d:/TMDT2
git init
git branch -M main
git add .
git commit -m "Initial commit: configure Railway + Vercel deployment"
git remote add origin https://github.com/TienDatzd99/goBook.git
git push -u origin main
```

Neu DA co repo git:

```bash
cd d:/TMDT2
git remote remove origin
git remote add origin https://github.com/TienDatzd99/goBook.git
git add .
git commit -m "Configure Railway backend and Vercel frontend"
git push -u origin main
```

## 2) Bien moi truong

- Frontend mau: `.env.example`
- Backend mau: `backend/.env.example`

Khi local:
- Tao `.env` tu `.env.example`
- Tao `backend/.env` tu `backend/.env.example`

## 3) Deploy Backend len Railway

File da cau hinh san:
- `railway.json`

### Cach deploy

1. Vao Railway, tao project moi.
2. Chon "Deploy from GitHub repo" va chon repo `goBook`.
3. Trong service backend, dat Root Directory la `backend` (khuyen nghi).
4. Them bien moi truong theo `backend/.env.example`.
5. Dat it nhat cac bien quan trong:
	- `JWT_SECRET`
	- `FRONTEND_URL` = domain Vercel production
	- `FRONTEND_URLS` = danh sach domain duoc phep (phan tach bang dau phay)
	- `ALLOW_VERCEL_PREVIEWS=true` (neu muon cho preview domain `*.vercel.app`)
	- Cac bien thanh toan/email neu dang su dung (VNPAY, MOMO, SMTP)

### Health check

- Endpoint: `/api/health`
- URL sau deploy (vi du): `https://your-backend.railway.app/api/health`

## 4) Deploy Frontend len Vercel

File da cau hinh san:
- `vercel.json`

### Cach deploy

1. Vao Vercel, Import Git Repository `goBook`.
2. Framework auto detect Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Them Environment Variables:
	- `VITE_API_URL=https://your-backend.railway.app`
	- `VITE_GOOGLE_CLIENT_ID=...` (neu su dung Google Login)
6. Redeploy project.

## 5) Ket noi Railway <-> Vercel

Sau khi co domain that:

1. Cap nhat tren Railway:
	- `FRONTEND_URL=https://your-frontend.vercel.app`
	- `FRONTEND_URLS=https://your-frontend.vercel.app,https://www.your-domain.com`
2. Cap nhat tren Vercel:
	- `VITE_API_URL=https://your-backend.railway.app`
3. Redeploy ca Railway va Vercel.

## 6) Chay local

Frontend:

```bash
cd d:/TMDT2
npm install
npm run dev
```

Backend:

```bash
cd d:/TMDT2/backend
npm install
npm run dev
```

Mac dinh:
- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:3001`
