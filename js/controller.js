export class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    
    // Admin Temporales
    this.adminClicks = 0;
    this.adminTimeout = null;
    this.tempShifts = [];
    
    this.catClicks = 0;
    this.catTimeout = null;
    this.tempCats = [];

    // --- Suscripciones al Modelo ---
    this.model.bind('onDataChanged', data => this.renderGrid(data));
    this.model.bind('onConfigChanged', shifts => this.renderLegend(shifts));
    this.model.bind('onConnChanged', conn => this.view.setConnStatus(conn.state, conn.label));
    this.model.bind('onNotesChanged', cats => this.view.renderNotes(cats, this.handleNotesInput.bind(this)));
    this.model.bind('onModeChanged', mode => this.view.renderMode(mode));
    this.model.bind('onToast', msg => this.view.toast(msg));

    // --- Event Listeners Globales ---
    this.initEventListeners();
  }

  init() {
    const usesFB = this.model.init();
    this.view.showSetupBanner(!usesFB);
    this.renderLegend(this.model.SHIFTS);
    this.renderGrid(this.model.data);
    this.view.renderNotes(this.model.notesCategories, this.handleNotesInput.bind(this));
  }

  initEventListeners() {
    // Modo Edición
    document.getElementById('edit-toggle').addEventListener('click', () => {
      this.model.toggleEditMode();
      this.renderGrid(this.model.data);
    });

    // Limpiar Todo
    document.getElementById('btn-clear').addEventListener('click', () => {
      const resp = prompt('¿Estás seguro de que quieres borrar todo el horario?\n\nPara confirmar, escribe la palabra BORRAR en mayúsculas:');
      if (resp === 'BORRAR') {
        this.model.clearAll();
      } else if (resp !== null) {
        this.view.toast('❌ Acción cancelada');
      }
    });

    // Navegación
    document.getElementById('btn-to-notes').addEventListener('click', () => {
      this.view.toggleView('notes');
    });
    document.getElementById('btn-to-schedule').addEventListener('click', () => {
      this.view.toggleView('schedule');
    });

    // Modal Name
    document.getElementById('m-btn-cancel').addEventListener('click', () => this.view.closeNameModal());
    document.getElementById('m-btn-confirm').addEventListener('click', () => this.confirmNameModal());
    document.getElementById('m-input').addEventListener('keydown', e => {
      if(e.key === 'Enter') this.confirmNameModal();
    });

    // Clicks Admin Turnos
    document.getElementById('admin-trigger').addEventListener('click', () => {
      this.adminClicks++;
      clearTimeout(this.adminTimeout);
      this.adminTimeout = setTimeout(() => this.adminClicks = 0, 1500);
      if (this.adminClicks >= 5) {
        this.adminClicks = 0;
        this.openAdminModal();
      }
    });

    // Admin Turnos Modal
    document.getElementById('admin-btn-add').addEventListener('click', () => this.adminAddShift());
    document.getElementById('admin-btn-cancel').addEventListener('click', () => this.view.closeAdminModal());
    document.getElementById('admin-btn-save').addEventListener('click', () => this.saveAdminShifts());

    // Clicks Admin Categorías Notas
    document.getElementById('cat-admin-trigger').addEventListener('click', () => {
      this.catClicks++;
      clearTimeout(this.catTimeout);
      this.catTimeout = setTimeout(() => this.catClicks = 0, 1500);
      if (this.catClicks >= 5) {
        this.catClicks = 0;
        this.openCatModal();
      }
    });

    // Admin Categorías Modal
    document.getElementById('cat-btn-add').addEventListener('click', () => this.catAdd());
    document.getElementById('cat-btn-cancel').addEventListener('click', () => this.view.closeCatModal());
    document.getElementById('cat-btn-save').addEventListener('click', () => this.saveCatAdmin());

    // Cerrar modales con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.view.closeNameModal();
        this.view.closeAdminModal();
        this.view.closeCatModal();
      }
    });
    
    // Overlays click
    document.getElementById('overlay').addEventListener('click', e => { if(e.target.id === 'overlay') this.view.closeNameModal(); });
    document.getElementById('admin-overlay').addEventListener('click', e => { if(e.target.id === 'admin-overlay') this.view.closeAdminModal(); });
    document.getElementById('cat-overlay').addEventListener('click', e => { if(e.target.id === 'cat-overlay') this.view.closeCatModal(); });

    // Print
    document.getElementById('btn-print-light').addEventListener('click', () => {
      document.body.classList.remove('print-dark');
      this.setPrintDate();
      window.print();
    });
    document.getElementById('btn-print-dark').addEventListener('click', () => {
      document.documentElement.classList.add('print-dark');
      document.body.classList.add('print-dark');
      this.setPrintDate();
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          window.addEventListener('afterprint', () => {
            document.documentElement.classList.remove('print-dark');
            document.body.classList.remove('print-dark');
          }, { once: true });
        }, 80);
      });
    });
  }

  renderLegend(shifts) {
    this.view.renderLegend(shifts, this.model.PALETTE);
  }

  renderGrid(data) {
    this.view.renderGrid(
      data, 
      this.model.SHIFTS, 
      this.model.DAYS, 
      this.model.PALETTE, 
      this.model.isEditMode,
      this.openNameModal.bind(this),
      this.removeName.bind(this)
    );
  }

  handleNotesInput(catId, content) {
    this.model.updateNotesCategory(catId, content);
  }

  // --- Actions Name Modal ---
  openNameModal(day, shiftId, editing, initialName) {
    this.currentEdit = { day, shiftId };
    const shift = this.model.SHIFTS.find(s => s.id === shiftId);
    this.view.openNameModal(day, shift.label, shift.hours, editing, initialName);
  }

  confirmNameModal() {
    const name = this.view.getNameInputValue();
    
    // Easter egg protection
    const nameLower = name.toLowerCase();
    const bodrios = ['cmnhectorin', 'galamierdas', 'eduardus', 'qbi', 'martha', 'siri', 'sirimierdas'];
    if (bodrios.includes(nameLower)) {
      this.view.toast('❌ Intento bloqueado por ser Puro Bodrio');
      return;
    }

    if (!name) {
      this.view.showNameModalError();
      return;
    }
    this.model.setName(this.currentEdit.day, this.currentEdit.shiftId, name);
    this.view.closeNameModal();
  }

  removeName(day, shiftId, name) {
    this.model.setName(day, shiftId, null);
    this.view.toast(`🗑 "${name}" eliminado`);
  }

  setPrintDate() {
    document.getElementById('print-date').textContent =
      'Generado el ' + new Date().toLocaleDateString('es-MX',
        { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }

  // --- Admin Shifts Logic ---
  openAdminModal() {
    this.tempShifts = JSON.parse(JSON.stringify(this.model.SHIFTS));
    this.view.renderAdminShiftsList(this.tempShifts, this.adminMoveShift.bind(this), this.adminRemoveShift.bind(this));
    this.view.openAdminModal();
  }

  _syncAdminInputs() {
    const inputs = this.view.getAdminShiftsInputs(this.tempShifts.length);
    inputs.forEach((inp, i) => {
      this.tempShifts[i].label = inp.label;
      this.tempShifts[i].hours = inp.hours;
    });
  }

  adminAddShift() {
    this._syncAdminInputs();
    this.tempShifts.push({ id: 's_' + Date.now(), label: 'Nuevo Turno', hours: '00:00 – 00:00' });
    this.view.renderAdminShiftsList(this.tempShifts, this.adminMoveShift.bind(this), this.adminRemoveShift.bind(this));
    const list = document.getElementById('admin-shifts-list');
    list.scrollTop = list.scrollHeight;
  }

  adminRemoveShift(index) {
    if (confirm('¿Seguro que quieres quitar este turno?')) {
      this.tempShifts.splice(index, 1);
      this.view.renderAdminShiftsList(this.tempShifts, this.adminMoveShift.bind(this), this.adminRemoveShift.bind(this));
    }
  }

  adminMoveShift(index, direction) {
    this._syncAdminInputs();
    if (index + direction < 0 || index + direction >= this.tempShifts.length) return;
    const temp = this.tempShifts[index];
    this.tempShifts[index] = this.tempShifts[index + direction];
    this.tempShifts[index + direction] = temp;
    this.view.renderAdminShiftsList(this.tempShifts, this.adminMoveShift.bind(this), this.adminRemoveShift.bind(this));
  }

  saveAdminShifts() {
    this._syncAdminInputs();
    this.model.saveShifts(this.tempShifts);
    this.view.closeAdminModal();
  }

  // --- Admin Categories Logic ---
  openCatModal() {
    this.tempCats = JSON.parse(JSON.stringify(this.model.notesCategories));
    this.view.renderCatList(this.tempCats, this.catMove.bind(this), this.catRemove.bind(this));
    this.view.openCatModal();
  }

  _syncCatInputs() {
    const inputs = this.view.getCatInputs(this.tempCats.length);
    inputs.forEach((inp, i) => {
      this.tempCats[i].title = inp.title;
    });
  }

  catAdd() {
    this._syncCatInputs();
    this.tempCats.push({ id: 'c_' + Date.now(), title: 'Nueva Categoría', content: '' });
    this.view.renderCatList(this.tempCats, this.catMove.bind(this), this.catRemove.bind(this));
  }

  catRemove(index) {
    if (confirm('¿Seguro que quieres borrar esta categoría y todo su contenido?')) {
      this.tempCats.splice(index, 1);
      this.view.renderCatList(this.tempCats, this.catMove.bind(this), this.catRemove.bind(this));
    }
  }

  catMove(index, direction) {
    this._syncCatInputs();
    if (index + direction < 0 || index + direction >= this.tempCats.length) return;
    const temp = this.tempCats[index];
    this.tempCats[index] = this.tempCats[index + direction];
    this.tempCats[index + direction] = temp;
    this.view.renderCatList(this.tempCats, this.catMove.bind(this), this.catRemove.bind(this));
  }

  saveCatAdmin() {
    this._syncCatInputs();
    this.model.saveCategoriesOrder(this.tempCats);
    this.view.closeCatModal();
  }
}
