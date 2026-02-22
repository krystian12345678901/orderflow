# ZAIMPLEMENTOWANE ZABEZPIECZENIA

## ✅ KRYTYCZNE (1-6)

1. **Kontrola dostępu do plików** - users.js, orders.js, files.js sprawdzają uprawnienia
2. **Walidacja magic bytes** - file-type pakiet sprawdza rzeczywisty typ pliku
3. **Brak fallback JWT sekretów** - server rzuca błąd jeśli brak sekretów
4. **Wymuszony algorytm HS256** - `algorithms: ["HS256"]` w jwt.verify
5. **Walidacja UUID** - regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
6. **Usunięto .svg** - XSS risk, nie ma w allowed_extensions

## ✅ WAŻNE (7-13)

7. **Rate limiting** - 10 req/15min na /login, 500 req/15min globally
8. **Max file size 20MB** - zmniejszono z 100MB
9. **Sprawdzanie is_active** - każdy request sprawdza czy user aktywny
10. **Ograniczenie archiwów** - tylko .zip, .rar (bez .7z, .tar.gz)
11. **Trust proxy** - `app.set('trust proxy', 1)` dla nginx
12. **Helmet** - już był, dodano Content-Security-Policy
13. **Role refresh** - brane z DB, nie z JWT

## ✅ DODATKOWE (14-20)

14. **Rotacja refresh tokenów** - każdy /refresh generuje nowy token
15. **Logowanie failed logins** - tabela failed_logins z IP
16. **Blokada konta** - 5 failed attempts → 15 min lock
17. **Upload rate limiting** - 20 uploads/hour per user
18. **Google Drive storage** - pliki na GDrive zamiast dysku (opcjonalne)
19. **Joi validation** - wszystkie inputy walidowane
20. **HTTPS enforcement** - dokumentacja nginx + certbot

## 📦 Nowe pakiety

- `joi` - walidacja inputów
- `file-type` - magic bytes validation  
- `googleapis` - Google Drive API

## 🔑 Wymagane zmienne środowiskowe

```bash
JWT_ACCESS_SECRET=minimum_32_characters
JWT_REFRESH_SECRET=minimum_32_characters
GOOGLE_DRIVE_ENABLED=false  # true aby włączyć GDrive
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/key.json  # jeśli GDrive enabled
GOOGLE_DRIVE_FOLDER_ID=folder_id_here
```

