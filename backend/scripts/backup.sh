#!/bin/bash
# ═══════════════════════════════════════════════
# Soru Bankası — PostgreSQL Otomatik Yedekleme
# ═══════════════════════════════════════════════
# 
# Kullanım:
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh
#
# Cron ile otomatik (her gece 03:00):
#   0 3 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
#
# ═══════════════════════════════════════════════

set -e

# --- Ayarlar ---
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"

# Tarih
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/sorubankasi_${DATE}.sql.gz"

echo "═══════════════════════════════════════════════"
echo "🗄️  Soru Bankası Yedekleme Başlatıldı"
echo "📅  Tarih: ${DATE}"
echo "═══════════════════════════════════════════════"

# Backup klasörünü oluştur
mkdir -p "${BACKUP_DIR}"

# .env dosyasından DATABASE_URL'yi al (eğer set edilmediyse)
if [ -z "$DB_URL" ]; then
    if [ -f ".env" ]; then
        DB_URL=$(grep "^DATABASE_URL" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi
fi

if [ -z "$DB_URL" ]; then
    echo "❌ HATA: DATABASE_URL bulunamadı!"
    echo "   .env dosyası mevcut olmalı veya DATABASE_URL ortam değişkeni set edilmeli."
    exit 1
fi

# PostgreSQL URL'den bilgileri çıkar
# Format: postgresql://user:password@host:port/database
PGHOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|')
PGPORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
PGDATABASE=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')
PGUSER=$(echo "$DB_URL" | sed -E 's|.*://([^:]+):.*|\1|')
PGPASSWORD=$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')

export PGPASSWORD

echo "📦  Veritabanı: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo "📁  Hedef: ${BACKUP_FILE}"
echo ""

# pg_dump ile yedekle
echo "⏳  Yedekleniyor..."
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"

# Boyutu göster
FILESIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅  Yedekleme tamamlandı! Boyut: ${FILESIZE}"

# Eski yedekleri temizle
echo ""
echo "🧹  ${RETAIN_DAYS} günden eski yedekler temizleniyor..."
DELETED=$(find "${BACKUP_DIR}" -name "sorubankasi_*.sql.gz" -mtime +${RETAIN_DAYS} -delete -print | wc -l)
echo "   ${DELETED} eski yedek silindi."

# Mevcut yedekleri listele
echo ""
echo "📋  Mevcut Yedekler:"
ls -lhS "${BACKUP_DIR}"/sorubankasi_*.sql.gz 2>/dev/null | awk '{print "   " $5 "\t" $9}' || echo "   (yok)"

echo ""
echo "═══════════════════════════════════════════════"
echo "🎉  İşlem tamamlandı!"
echo "═══════════════════════════════════════════════"
