# OrderFlow - Szybki Start

## 🚀 Wdrożenie w 3 krokach

### 1. Zbuduj aplikację
```bash
./build.sh
```

### 2. Skonfiguruj
```bash
cp .env.production backend/.env
nano backend/.env
```

**Zmień sekrety JWT:**
```bash
# Wygeneruj nowe sekrety:
openssl rand -base64 32
# Skopiuj wynik do JWT_ACCESS_SECRET w .env

openssl rand -base64 32
# Skopiuj wynik do JWT_REFRESH_SECRET w .env
```

### 3. Uruchom
```bash
./start.sh
```

✅ **Gotowe!** Otwórz: `http://localhost:5000`

---

## 🔐 Pierwsze logowanie

Email: `admin@firma.pl`  
Hasło: `Admin123!`

**⚠️ Zmień to hasło w Panelu Admin → Użytkownicy!**

---

## 🔄 Restart aplikacji

### Jeśli używasz PM2:
```bash
pm2 restart orderflow
```

### Bez PM2:
```bash
# Zatrzymaj: Ctrl+C
./start.sh  # Uruchom ponownie
```

---

## 📝 Uwagi

- Baza danych tworzy się automatycznie przy pierwszym uruchomieniu
- Konta testowe są tworzone tylko raz (przy pustej bazie)
- Pliki zapisują się w `backend/uploads/`
- Baza danych jest w `backend/data/orderflow.db`

---

## 💾 Backup

Regularnie backupuj:
```bash
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data backend/uploads
```

---

## 🆘 Pomoc

Problem? Sprawdź `README.md` → sekcja Troubleshooting
