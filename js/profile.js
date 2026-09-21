/**
 * MAISYA-TRANS - Profile & Account Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const ProfileView = {
  load() {
    const container = document.getElementById('profileContentContainer');
    if (!container) return;

    const user = Auth.getUser();
    if (!user) {
      container.innerHTML = '<div style="text-align:center; padding:2rem;">Silakan login terlebih dahulu.</div>';
      return;
    }

    container.innerHTML = `
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-radius:var(--border-radius-lg); padding:1.5rem; margin-bottom:1.5rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; align-items:center; gap:1.25rem; margin-bottom:1.25rem;">
          <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, var(--primary-700), var(--gold-500)); color:white; display:flex; align-items:center; justify-content:center; font-size:1.6rem; font-weight:800; box-shadow:0 4px 12px rgba(13,92,58,0.25);">
            ${user.nama ? user.nama.charAt(0) : 'U'}
          </div>
          <div>
            <h3 style="font-size:1.2rem; color:var(--text-primary);">${user.nama}</h3>
            <div style="font-size:0.85rem; color:var(--primary-700); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
              ${user.role === 'ADMIN' ? '👑 Admin Sarpras Pondok' : '👤 Guru / Karyawan Pondok'}
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${user.jabatan || 'Pendidik'} • ${user.divisi || 'Pondok'}</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem; background:var(--surface-secondary); padding:1rem; border-radius:var(--border-radius-md); font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Nomor Induk Pegawai (NIP):</span>
            <strong>${user.nip || '-'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Email Akun:</span>
            <strong>${user.email}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">WhatsApp / HP:</span>
            <strong>${user.no_hp || '-'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Status Akun:</span>
            <span class="badge badge-available">${user.status || 'ACTIVE'}</span>
          </div>
        </div>

        <div style="margin-top:1.5rem; display:flex; flex-direction:column; gap:0.75rem;">
          <button class="btn btn-outline btn-block" onclick="UI.toggleTheme()">
            🌓 Ganti Mode Tampilan (Terang / Gelap)
          </button>
          <button class="btn btn-danger btn-block" onclick="Auth.logout()" style="font-weight:700; padding:0.75rem;">
            🚪 Keluar dari Aplikasi (Logout)
          </button>
        </div>
      </div>
    `;
  }
};
