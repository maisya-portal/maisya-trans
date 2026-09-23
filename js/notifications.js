/**
 * MAISYA-TRANS - Notifications Controller
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const NotificationsView = {
  notifications: [],

  load() {
    // 1. Render data lokal instan (0ms)
    const localRes = Api.getMockDataSync('getNotifications', {}, Auth.getUser());
    this.notifications = (localRes && localRes.data) || Store.data.notifications || [];
    this.render();
    this.updateHeaderBadge();

    // 2. Background Revalidation
    Api.request('getNotifications', 'GET', {}, false).then(res => {
      if (res && res.success && res.data) {
        this.notifications = res.data;
        this.render();
        this.updateHeaderBadge();
      }
    }).catch(() => {});
  },

  render() {
    const container = document.getElementById('notificationsListContainer');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔔</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary);">Tidak Ada Notifikasi Baru</div>
          <p style="font-size: 0.85rem; margin-top: 4px;">Pemberitahuan peminjaman, persetujuan, dan servis akan tampil di sini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications.map(n => `
      <div style="background:var(--surface); border:1px solid var(--surface-border); border-left:4px solid ${n.type.includes('GANTI_OLI') || n.type.includes('KERUSAKAN') ? '#EF4444' : 'var(--primary-700)'}; border-radius:var(--border-radius-md); padding:1rem; margin-bottom:0.75rem; opacity:${n.isRead ? '0.75' : '1'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary);">${n.title}</div>
          <span style="font-size:0.72rem; color:var(--text-muted);">${Utils.formatDateTime(n.createdAt)}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">
          ${n.message}
        </p>
        ${!n.isRead ? `
          <button class="btn btn-outline btn-sm" style="margin-top:0.5rem; font-size:0.72rem; padding:3px 8px;" onclick="NotificationsView.markRead('${n.notificationId}')">
            Tandai sudah dibaca
          </button>
        ` : ''}
      </div>
    `).join('');
  },

  async markRead(notificationId) {
    await Api.request('markNotificationRead', 'POST', { notificationId });
    const notif = this.notifications.find(n => n.notificationId === notificationId);
    if (notif) notif.isRead = true;
    this.render();
    this.updateHeaderBadge();
  },

  updateHeaderBadge() {
    const unread = this.notifications.filter(n => !n.isRead).length;
    const badge = document.getElementById('headerNotifBadge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
};
