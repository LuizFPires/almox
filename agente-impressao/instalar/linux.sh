#!/usr/bin/env sh
# Instala o agente de impressão do Almox como serviço systemd (liga com o PC e volta
# sozinho se cair). Rode na pasta agente-impressao:
#   sudo sh instalar/linux.sh            instala e liga
#   sudo sh instalar/linux.sh remover    remove
set -eu

SERVICO=almox-agente
UNIDADE=/etc/systemd/system/$SERVICO.service
PASTA=$(cd "$(dirname "$0")/.." && pwd)

if [ "${1:-}" = "remover" ]; then
  systemctl disable --now "$SERVICO" || true
  rm -f "$UNIDADE"
  systemctl daemon-reload
  echo "Agente removido."
  exit 0
fi

NODE=$(command -v node || true)
[ -n "$NODE" ] || { echo "Node.js não encontrado. Instale o Node 24 LTS." >&2; exit 1; }
"$NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=18)?0:1)' \
  || { echo "Node $("$NODE" --version) é antigo. Instale o Node 24 LTS." >&2; exit 1; }
[ -f "$PASTA/.env" ] || { echo "Falta o .env. Copie .env.example e cole a configuração da tela Impressora." >&2; exit 1; }

USUARIO=${SUDO_USER:-$(id -un)}
chmod 600 "$PASTA/.env"
chown "$USUARIO" "$PASTA/.env"

cat > "$UNIDADE" <<EOF
[Unit]
Description=Almox - agente de impressão
After=network-online.target
Wants=network-online.target

[Service]
User=$USUARIO
WorkingDirectory=$PASTA
ExecStart=$NODE src/agente.ts
Restart=always
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICO"
echo "Agente instalado e ligado. Log: journalctl -u $SERVICO -f"
echo 'Confira na tela Impressora do app: deve aparecer "Agente online".'
