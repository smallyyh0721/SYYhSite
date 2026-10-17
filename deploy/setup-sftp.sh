#!/usr/bin/env bash
set -euo pipefail
# Run via sudo. Only the dedicated upload identity and its namespace are changed.
task_key=${1:?Pass the public-key file path}
task_user=syyh-upload
task_uid=11002
task_root=/var/lib/syyh-sftp
task_config=/etc/ssh/sshd_config.d/60-syyh-upload.conf
[[ -s "$task_key" ]] || { echo 'Public key is missing'; exit 1; }
ssh-keygen -l -f "$task_key" >/dev/null
if id "$task_user" >/dev/null 2>&1; then
  [[ "$(id -u "$task_user")" == "$task_uid" && "$(id -g "$task_user")" == "$task_uid" ]] || { echo 'Existing upload identity differs; preserving it'; exit 1; }
else
  ! getent passwd "$task_uid" >/dev/null || { echo 'UID already belongs to another identity'; exit 1; }
  ! getent group "$task_uid" >/dev/null || { echo 'GID already belongs to another group'; exit 1; }
  groupadd --gid "$task_uid" "$task_user"
  useradd --uid "$task_uid" --gid "$task_uid" --home-dir /inbox --shell /usr/sbin/nologin --no-create-home "$task_user"
fi
install -d -o root -g root -m 755 "$task_root"
install -d -o "$task_uid" -g "$task_uid" -m 750 "$task_root/inbox"
install -d -o root -g root -m 755 /etc/ssh/authorized_keys
task_key_target=/etc/ssh/authorized_keys/syyh-upload
task_prepared=$(mktemp /tmp/syyh-upload-key-XXXXXX)
printf 'restrict %s\n' "$(cat "$task_key")" > "$task_prepared"
if [[ -f "$task_key_target" ]] && ! cmp -s "$task_prepared" "$task_key_target"; then
  rm -f "$task_prepared"
  echo 'Existing upload key differs; preserving it'; exit 1
fi
install -o root -g root -m 644 "$task_prepared" "$task_key_target"
rm -f "$task_prepared"
task_backup=$(mktemp /tmp/syyh-upload-sshd-XXXXXX)
task_had_config=0
if [[ -f "$task_config" ]]; then cp "$task_config" "$task_backup"; task_had_config=1; fi
cat > "$task_config" <<'EOF'
# Managed SYYH upload identity only. Normal SSH identities are unaffected.
Match User syyh-upload
    ChrootDirectory /var/lib/syyh-sftp
    ForceCommand internal-sftp -d /inbox -u 0027
    AuthorizedKeysFile /etc/ssh/authorized_keys/syyh-upload
    AuthenticationMethods publickey
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    DisableForwarding yes
    PermitTTY no
Match all
EOF
if ! /usr/sbin/sshd -t; then
  if [[ "$task_had_config" == 1 ]]; then cp "$task_backup" "$task_config"; else rm -f "$task_config"; fi
  rm -f "$task_backup"
  echo 'sshd validation failed; previous dedicated configuration restored'; exit 1
fi
rm -f "$task_backup"
systemctl reload ssh
echo 'Dedicated key-only SFTP ready: syyh-upload, chroot /var/lib/syyh-sftp, writable /inbox.'
