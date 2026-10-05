// app-settings.js
import { dataManager } from './dataManager.js';

export function exportData() {
  Promise.all([
    dataManager.load('schedule'),
    dataManager.load('homework')
  ]).then(([schedule, homework]) => {
    const ext = localStorage.getItem('extracurricularDB');
    const data = {
      schedule,
      homework,
      extracurricular: ext ? JSON.parse(ext) : null
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-ibd2026.json';
    a.click();
    URL.revokeObjectURL(url);
  }).catch(console.error);
}

export function importData(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.schedule) await dataManager.save('schedule', data.schedule);
      if (data.homework) await dataManager.save('homework', data.homework);
      if (data.extracurricular) {
        localStorage.setItem('extracurricularDB', JSON.stringify(data.extracurricular));
      }
      alert('✅ Данные успешно восстановлены!');
      location.reload();
    } catch (err) {
      alert('❌ Ошибка при импорте: ' + err.message);
    }
  };
  reader.readAsText(file);
}

export function initSidebarButtons() {
  const themeBtn = document.getElementById('settingsThemeBtn');
  const exportBtn = document.getElementById('settingsExportBtn');
  const importBtn = document.getElementById('settingsImportBtn');
  const fileInput = document.getElementById('settingsImportInput');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      if (window.openThemeModal) window.openThemeModal();
    });
  }
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) importData(e.target.files[0]);
    });
  }
}

document.addEventListener('DOMContentLoaded', initSidebarButtons);