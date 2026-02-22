# OrderFlow v2 — System zarządzania zleceniami produkcyjnymi

Kompletny system webowy do zarządzania wieloetapowym workflow produkcji graficznej.

## ✨ Funkcje

- **Wielorole** — użytkownicy mogą mieć kilka ról jednocześnie
- **15-etapowy workflow** z maszyną stanów i automatycznymi timeoutami (2h/etap)
- **QC odrzucenie → poprawka** — odrzucone zlecenia wracają do autora z timerem 2h
- **Szablony zleceń** — dynamiczne formularze z konfigurowalnymi polami
- **Upload plików** — każdy etap może wgrywać i pobierać pliki poprzednich etapów
- **Konfiguracja per rola** — admin ustala dozwolone typy plików dla każdej roli
- **Statystyki twórców** — automatyczne zliczanie pracy każdego użytkownika
- **Panel administracyjny** — zarządzanie rolami, szablonami, użytkownikami
- **Gotowa do wdrożenia** — zbudowana aplikacja webowa na jednym porcie

---

## 🚀 WDROŻENIE NA SERWER (PRODUKCJA)

### Metoda 1: Bezpośrednio na serwerze

**Wymagania:** Node.js 18+, npm

```bash
# 1. Wgraj pliki na serwer (lub sklonuj repo)
cd /var/www/orderflow

# 2. Zbuduj aplikację
./build.sh
# To zainstaluje zależności i zbuduje frontend do statycznych plików

# 3. Skonfiguruj zmienne środowiskowe
cp .env.production backend/.env
nano backend/.env

# WAŻNE: Zmień JWT_ACCESS_SECRET i JWT_REFRESH_SECRET!
# Wygeneruj losowe sekrety:
#   openssl rand -base64 32

# 4. Uruchom
./start.sh
```

✅ **Aplikacja działa na `http://twoj-serwer:5000`**

Frontend i backend działają razem na **jednym porcie 5000**.

#### Uruchomienie jako demon (PM2 - zalecane):

```bash
npm install -g pm2
cd backend
pm2 start server.js --name orderflow --env production
pm2 save
pm2 startup  # Auto-start po restarcie serwera
```

Zarządzanie:
```bash
pm2 status           # Status
pm2 logs orderflow   # Logi
pm2 restart orderflow
pm2 stop orderflow
```

#### Nginx Reverse Proxy (zalecane dla domeny + HTTPS):

`/etc/nginx/sites-available/orderflow`:
```nginx
server {
    listen 80;
    server_name twoja-domena.pl;

    client_max_body_size 100M;  # Limity upload

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktywuj:
```bash
sudo ln -s /etc/nginx/sites-available/orderflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS (certbot):
```bash
sudo certbot --nginx -d twoja-domena.pl
```

### Metoda 2: Docker

```bash
# 1. Ustaw sekrety JWT (generuj losowe)
export JWT_ACCESS_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# 2. Zbuduj i uruchom
docker-compose up -d --build

# 3. Sprawdź status
docker-compose ps
docker-compose logs -f
```

✅ **Aplikacja na `http://localhost:5000`**

Zarządzanie:
```bash
docker-compose down         # Zatrzymaj
docker-compose restart      # Restart
docker-compose logs -f      # Logi na żywo
```

---

## 🛠 Rozwój lokalny (DEVELOPMENT)

```bash
# Terminal 1 - Backend
cd backend
cp .env.example .env
npm install
node server.js

# Terminal 2 - Frontend (hot reload)
cd frontend
npm install
npm run dev
```

- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:5000/api

---

## 📋 Dane testowe

Po pierwszym uruchomieniu system tworzy konta testowe:

| Email | Hasło | Role |
|-------|-------|------|
| admin@firma.pl | Admin123! | Administrator |
| biuro@firma.pl | Biuro123! | Pracownik Biura |
| multi@firma.pl | Multi123! | Redaktor + QC + Ilustrator |
| redaktor@firma.pl | Red123! | Redaktor |
| qc@firma.pl | QC1234! | Kontrola Jakości |
| ilustrator@firma.pl | Ilu123! | Ilustrator |
| grafik@firma.pl | Graf123! | Grafik |
| druk@firma.pl | Druk123! | Drukarz |

**⚠️ W produkcji:** Usuń lub zmień te konta przez panel admina!

---

## 🔄 Workflow

```
Nowe zlecenie (biuro)
  ↓
Pula Redaktorów → [Redakcja 2h] → QC
                                    ├─ ✅ Zatwierdź → Pula Ilustratorów
                                    └─ ❌ Odrzuć → ↩ ten sam Redaktor (2h na poprawkę)
                                                    ↓
                              Pula Ilustratorów → [Ilustracja 2h] → QC
                                                                      ├─ ✅ → Pula Grafików
                                                                      └─ ❌ → ↩ ten sam Ilustrator
                                                                              ↓
                                           Pula Grafików → [Projekt 2h] → QC
                                                                            ├─ ✅ → Pula Drukarzy
                                                                            └─ ❌ → ↩ ten sam Grafik
                                                                                    ↓
                                      Pula Drukarzy → [Druk 2h] → ✅ Zakończone
```

**Timeout:** Po 2h bez zakończenia etapu → automatyczny powrót do puli

---

## 📁 Struktura projektu

```
orderflow/
├── build.sh              # Skrypt budowania (frontend → dist/)
├── start.sh              # Uruchomienie produkcyjne
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Orchestracja Docker
├── .env.production       # Szablon zmiennych dla produkcji
│
├── backend/
│   ├── server.js         # Serwer Express (API + serwuje frontend/dist/)
│   ├── src/
│   │   ├── db.js         # SQLite, schema, seed
│   │   ├── auth.js       # JWT helpers
│   │   ├── state-machine.js
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, RBAC
│   │   └── workers/      # Timeout scheduler
│   ├── data/             # SQLite DB (tworzone auto)
│   └── uploads/          # Wgrane pliki
│
└── frontend/
    ├── src/
    │   ├── components/   # UI components
    │   ├── pages/        # React Router pages
    │   ├── lib/          # API client, constants
    │   └── store/        # Zustand stores
    └── dist/             # ← Zbudowany frontend (generowane przez build.sh)
```

---

## 🔧 Konfiguracja produkcyjna

### Wymagane zmienne środowiskowe (`backend/.env`):

```bash
NODE_ENV=production
PORT=5000

# WAŻNE: Wygeneruj losowe sekrety (min 32 znaki)!
JWT_ACCESS_SECRET=tutaj_wklej_wynik_openssl_rand_base64_32
JWT_REFRESH_SECRET=tutaj_wklej_inny_wynik_openssl_rand_base64_32
```

### Zalecenia produkcyjne:

1. **Sekrety JWT:** Użyj `openssl rand -base64 32` do generowania
2. **Baza danych:** SQLite OK do ~1000 zleceń/dzień. Powyżej → PostgreSQL
3. **Pliki:** Domyślnie dysk lokalny. Dla większych wolumenów → S3/MinIO
4. **Backup:** Regularnie backupuj `backend/data/` i `backend/uploads/`
5. **HTTPS:** Użyj certbot + nginx lub Cloudflare
6. **Firewall:** Otwórz tylko port 80/443 (nginx) lub 5000 (bezpośrednio)

---

## 📊 API Endpoints

### Auth
- `POST /api/auth/login` — logowanie (email, password)
- `POST /api/auth/refresh` — odświeżenie tokenu (cookie)
- `POST /api/auth/logout` — wylogowanie
- `GET /api/auth/me` — profil zalogowanego

### Orders
- `GET /api/orders` — lista (filtrowana wg roli)
- `POST /api/orders` — utwórz (biuro/admin)
- `GET /api/orders/:id` — szczegóły + historia + pliki
- `POST /api/orders/:id/claim` — przejmij z puli
- `POST /api/orders/:id/complete` — zakończ etap
- `POST /api/orders/:id/reject` — odrzuć do puli
- `POST /api/orders/:id/approve` — zatwierdź (QC)
- `POST /api/orders/:id/qc-reject` — odrzuć do autora (QC)
- `POST /api/orders/:id/cancel` — anuluj (admin)

### Files
- `GET /api/files/orders/:id` — lista plików
- `POST /api/files/orders/:id` — upload (multipart)
- `GET /api/files/orders/:id/files/:fileId/download` — pobierz
- `DELETE /api/files/orders/:id/files/:fileId` — usuń

### Admin
- `GET/PATCH /api/admin/roles` — konfiguracja ról (nazwy + kolory)
- `GET/PUT /api/admin/file-configs` — dozwolone rozszerzenia per rola
- `GET/POST/PATCH/DELETE /api/admin/templates` — szablony zleceń
- `GET /api/admin/creator-stats` — statystyki pracy użytkowników
- `GET /api/admin/dashboard` — dane do dashboardu

---

## 🆘 Troubleshooting

**Problem:** Port 5000 zajęty  
→ Zmień `PORT=6000` w `.env` i uruchom ponownie

**Problem:** `Cannot find module`  
→ `cd backend && npm install` (lub `./build.sh`)

**Problem:** Frontend nie ładuje się w produkcji  
→ Sprawdź czy `frontend/dist/` istnieje: `ls frontend/dist/`  
→ Jeśli brak: `cd frontend && npm run build`

**Problem:** JWT errors  
→ Upewnij się że `JWT_ACCESS_SECRET` i `JWT_REFRESH_SECRET` są ustawione w `.env`

**Problem:** CORS errors  
→ W produkcji backend serwuje frontend z tego samego origin — nie powinno być CORS  
→ Jeśli używasz nginx, sprawdź `proxy_set_header Host $host;`

---

## 📄 Licencja

Własnościowe oprogramowanie. Wszystkie prawa zastrzeżone.

## 🤝 Wsparcie

W razie problemów technicznych skontaktuj się z developerem.
